// Command proxy serves the web app and fronts the Câmara and Senado open-data
// APIs with a shared cache, a global per-API rate limit and a per-client rate limit.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))
	cfg, err := LoadConfig()
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(1)
	}
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck(cfg.Addr))
	}
	if err := run(cfg); err != nil {
		slog.Error("server", "err", err)
		os.Exit(1)
	}
}

func run(cfg Config) error {
	now := time.Now
	camara, err := NewUpstream("camara", cfg.Camara, camaraTTL, cfg.UpstreamTimeout, now)
	if err != nil {
		return err
	}
	senado, err := NewUpstream("senado", cfg.Senado, senadoTTL, cfg.UpstreamTimeout, now)
	if err != nil {
		return err
	}
	cache := NewMemoryCache(cfg.CacheMaxBytes, cfg.StaleMax, now)
	clients := NewClientLimiter(cfg.ClientRPS, cfg.ClientBurst, NewClientIPResolver(cfg.TrustedProxies, cfg.TrustCloudflare), now)
	proxy := NewProxy([]*Upstream{camara, senado}, cache, clients, cfg.QueueTimeout, now)

	mux := http.NewServeMux()
	mux.Handle("/api/", NewCORS(cfg.AllowedOrigins, proxy))
	if cfg.StaticDir != "" {
		mux.Handle("/", NewSPA(cfg.StaticDir))
	}
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":       true,
			"cache":    cache.Stats(),
			"hits":     proxy.Stats.Hits.Load(),
			"misses":   proxy.Stats.Misses.Load(),
			"stale":    proxy.Stats.Stale.Load(),
			"rejected": proxy.Stats.Rejected.Load(),
		})
	})

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      cfg.QueueTimeout + cfg.UpstreamTimeout + 5*time.Second,
		IdleTimeout:       90 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go sweep(ctx, clients)

	errs := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", cfg.Addr, "static", cfg.StaticDir, "camara_rps", cfg.Camara.RPS, "senado_rps", cfg.Senado.RPS)
		errs <- srv.ListenAndServe()
	}()
	select {
	case err := <-errs:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdown)
}

// healthcheck lets a distroless container (no shell, no curl) probe itself.
func healthcheck(addr string) int {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return 1
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "127.0.0.1"
	}
	client := http.Client{Timeout: 3 * time.Second}
	res, err := client.Get("http://" + net.JoinHostPort(host, port) + "/healthz")
	if err != nil {
		return 1
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

func sweep(ctx context.Context, clients *ClientLimiter) {
	t := time.NewTicker(time.Minute)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			clients.Sweep(10 * time.Minute)
		}
	}
}
