package main

import (
	"fmt"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"
)

// UpstreamConfig bounds how hard one government API may be hit.
type UpstreamConfig struct {
	Base          string
	RPS           float64
	Burst         int
	MaxConcurrent int
}

type Config struct {
	Addr            string
	AllowedOrigins  []string
	CacheMaxBytes   int64
	StaleMax        time.Duration
	QueueTimeout    time.Duration
	UpstreamTimeout time.Duration
	ClientRPS       float64
	ClientBurst     int
	TrustedProxies  []netip.Prefix
	TrustCloudflare bool
	StaticDir       string
	Camara          UpstreamConfig
	Senado          UpstreamConfig
}

// LoadConfig reads the environment; every value has a conservative default.
func LoadConfig() (Config, error) {
	env := envReader{}
	cfg := Config{
		Addr:            env.str("PROXY_ADDR", ":"+env.str("PORT", "8080")),
		AllowedOrigins:  env.list("PROXY_ALLOWED_ORIGINS", ""),
		CacheMaxBytes:   int64(env.int("PROXY_CACHE_MAX_MB", 256)) << 20,
		StaleMax:        env.duration("PROXY_STALE_MAX", 24*time.Hour),
		QueueTimeout:    env.duration("PROXY_QUEUE_TIMEOUT", 15*time.Second),
		UpstreamTimeout: env.duration("PROXY_UPSTREAM_TIMEOUT", 20*time.Second),
		ClientRPS:       env.float("PROXY_CLIENT_RPS", 20),
		ClientBurst:     env.int("PROXY_CLIENT_BURST", 120),
		TrustCloudflare: env.bool("PROXY_TRUST_CLOUDFLARE", true),
		StaticDir:       env.str("STATIC_DIR", ""),
		Camara: UpstreamConfig{
			Base:          env.str("CAMARA_BASE", "https://dadosabertos.camara.leg.br/api/v2"),
			RPS:           env.float("CAMARA_RPS", 5),
			Burst:         env.int("CAMARA_BURST", 10),
			MaxConcurrent: env.int("CAMARA_MAX_CONCURRENT", 4),
		},
		Senado: UpstreamConfig{
			Base:          env.str("SENADO_BASE", "https://legis.senado.leg.br/dadosabertos"),
			RPS:           env.float("SENADO_RPS", 2),
			Burst:         env.int("SENADO_BURST", 4),
			MaxConcurrent: env.int("SENADO_MAX_CONCURRENT", 2),
		},
	}
	trusted, err := parsePrefixes(env.list("PROXY_TRUSTED_PROXIES", defaultTrustedProxies))
	if err != nil {
		env.fail("PROXY_TRUSTED_PROXIES", "", err)
	}
	cfg.TrustedProxies = trusted
	return cfg, env.err
}

// envReader collects the first parse error so LoadConfig can report it once.
type envReader struct{ err error }

func (r *envReader) raw(key string) (string, bool) {
	v, ok := os.LookupEnv(key)
	return strings.TrimSpace(v), ok && strings.TrimSpace(v) != ""
}

func (r *envReader) fail(key, v string, err error) {
	if r.err == nil {
		r.err = fmt.Errorf("%s=%q: %w", key, v, err)
	}
}

func (r *envReader) str(key, def string) string {
	if v, ok := r.raw(key); ok {
		return v
	}
	return def
}

func (r *envReader) list(key, def string) []string {
	var out []string
	for p := range strings.SplitSeq(r.str(key, def), ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (r *envReader) int(key string, def int) int {
	v, ok := r.raw(key)
	if !ok {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		r.fail(key, v, fmt.Errorf("want a positive integer"))
		return def
	}
	return n
}

func (r *envReader) float(key string, def float64) float64 {
	v, ok := r.raw(key)
	if !ok {
		return def
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil || f <= 0 {
		r.fail(key, v, fmt.Errorf("want a positive number"))
		return def
	}
	return f
}

func (r *envReader) duration(key string, def time.Duration) time.Duration {
	v, ok := r.raw(key)
	if !ok {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil || d <= 0 {
		r.fail(key, v, fmt.Errorf("want a positive duration like 30s"))
		return def
	}
	return d
}

func (r *envReader) bool(key string, def bool) bool {
	v, ok := r.raw(key)
	if !ok {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		r.fail(key, v, err)
		return def
	}
	return b
}
