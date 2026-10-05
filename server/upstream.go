package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const maxBodyBytes = 32 << 20

var forwardedHeaders = []string{"Content-Type", "X-Total-Count", "Link"}

// ErrBusy means the request could not get an upstream slot within the queue timeout.
var ErrBusy = errors.New("upstream busy")

// StatusError is a non-cacheable upstream answer (429, 5xx...).
type StatusError struct {
	Status     int
	RetryAfter time.Duration
}

func (e *StatusError) Error() string { return fmt.Sprintf("upstream status %d", e.Status) }

// Upstream is one government API with a global request budget shared by every client.
type Upstream struct {
	Name    string
	base    *url.URL
	client  *http.Client
	limiter *rate.Limiter
	slots   chan struct{}
	ttl     TTLPolicy
	now     func() time.Time

	mu          sync.Mutex
	pausedUntil time.Time
}

func NewUpstream(name string, cfg UpstreamConfig, ttl TTLPolicy, timeout time.Duration, now func() time.Time) (*Upstream, error) {
	base, err := url.Parse(strings.TrimRight(cfg.Base, "/"))
	if err != nil || base.Scheme == "" || base.Host == "" {
		return nil, fmt.Errorf("%s: invalid base URL %q", name, cfg.Base)
	}
	return &Upstream{
		Name:    name,
		base:    base,
		client:  &http.Client{Timeout: timeout},
		limiter: rate.NewLimiter(rate.Limit(cfg.RPS), cfg.Burst),
		slots:   make(chan struct{}, cfg.MaxConcurrent),
		ttl:     ttl,
		now:     now,
	}, nil
}

// Fetch waits up to queueTimeout for the shared budget, calls upstream and returns a cacheable entry.
func (u *Upstream) Fetch(ctx context.Context, queueTimeout time.Duration, path string, query url.Values) (*Entry, error) {
	queue, cancel := context.WithTimeout(ctx, queueTimeout)
	release, err := u.acquire(queue)
	cancel()
	if err != nil {
		return nil, err
	}
	defer release()

	target := *u.base
	target.Path = u.base.Path + path
	target.RawQuery = query.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "congresso-aberto-proxy/1.0")

	start := u.now()
	res, err := u.client.Do(req)
	if err != nil {
		slog.Warn("upstream error", "upstream", u.Name, "path", path, "err", err)
		return nil, err
	}
	defer res.Body.Close()
	slog.Info("upstream", "upstream", u.Name, "path", path, "status", res.StatusCode, "ms", u.now().Sub(start).Milliseconds())

	if res.StatusCode == http.StatusTooManyRequests || res.StatusCode >= 500 {
		retry := retryAfter(res.Header.Get("Retry-After"), 10*time.Second)
		if res.StatusCode == http.StatusTooManyRequests || res.StatusCode == http.StatusServiceUnavailable {
			u.pause(retry)
		}
		_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, maxBodyBytes))
		return nil, &StatusError{Status: res.StatusCode, RetryAfter: retry}
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, maxBodyBytes))
	if err != nil {
		return nil, err
	}
	header := http.Header{}
	for _, h := range forwardedHeaders {
		if v := res.Header.Get(h); v != "" {
			header.Set(h, v)
		}
	}
	return &Entry{Status: res.StatusCode, Header: header, Body: body, StoredAt: u.now(), TTL: u.ttlFor(res.StatusCode, path)}, nil
}

func (u *Upstream) ttlFor(status int, path string) time.Duration {
	switch {
	case status == http.StatusOK:
		return u.ttl.For(path)
	case status >= 400 && status < 500:
		return negativeTTL
	default:
		return 0
	}
}

// acquire honours a 429/503 pause, the token bucket and the concurrency cap, in that order.
func (u *Upstream) acquire(ctx context.Context) (func(), error) {
	if wait := u.pausedFor(); wait > 0 {
		t := time.NewTimer(wait)
		defer t.Stop()
		select {
		case <-ctx.Done():
			return nil, ErrBusy
		case <-t.C:
		}
	}
	if err := u.limiter.Wait(ctx); err != nil {
		return nil, ErrBusy
	}
	select {
	case u.slots <- struct{}{}:
		return func() { <-u.slots }, nil
	case <-ctx.Done():
		return nil, ErrBusy
	}
}

func (u *Upstream) pause(d time.Duration) {
	u.mu.Lock()
	defer u.mu.Unlock()
	if until := u.now().Add(d); until.After(u.pausedUntil) {
		u.pausedUntil = until
		slog.Warn("upstream paused", "upstream", u.Name, "for", d)
	}
}

func (u *Upstream) pausedFor() time.Duration {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.pausedUntil.Sub(u.now())
}

func retryAfter(v string, fallback time.Duration) time.Duration {
	if s, err := strconv.Atoi(strings.TrimSpace(v)); err == nil && s > 0 {
		return min(time.Duration(s)*time.Second, 5*time.Minute)
	}
	if t, err := http.ParseTime(v); err == nil {
		if d := time.Until(t); d > 0 {
			return min(d, 5*time.Minute)
		}
	}
	return fallback
}
