package main

import (
	"context"
	"errors"
	"log/slog"
	"maps"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"golang.org/x/sync/singleflight"
)

var safePath = regexp.MustCompile(`^(/[A-Za-z0-9_\-.]+)*$`)

type ProxyStats struct {
	Hits     atomic.Int64
	Misses   atomic.Int64
	Stale    atomic.Int64
	Rejected atomic.Int64
}

// Proxy serves /api/{upstream}/{path} from cache, falling back to a rate-limited upstream call.
type Proxy struct {
	upstreams    map[string]*Upstream
	cache        Cache
	clients      *ClientLimiter
	group        singleflight.Group
	queueTimeout time.Duration
	now          func() time.Time
	Stats        ProxyStats
}

func NewProxy(upstreams []*Upstream, cache Cache, clients *ClientLimiter, queueTimeout time.Duration, now func() time.Time) *Proxy {
	byName := make(map[string]*Upstream, len(upstreams))
	for _, u := range upstreams {
		byName[u.Name] = u
	}
	return &Proxy{upstreams: byName, cache: cache, clients: clients, queueTimeout: queueTimeout, now: now}
}

type request struct {
	upstream *Upstream
	path     string
	query    url.Values
	key      string
}

func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD, OPTIONS")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	req, status := p.parse(r)
	if status != 0 {
		http.Error(w, http.StatusText(status), status)
		return
	}
	if ok, wait := p.clients.Allow(r); !ok {
		p.Stats.Rejected.Add(1)
		w.Header().Set("Retry-After", seconds(wait))
		http.Error(w, "too many requests", http.StatusTooManyRequests)
		return
	}

	now := p.now()
	cached, found := p.cache.Get(req.key)
	switch {
	case found && cached.Fresh(now):
		p.Stats.Hits.Add(1)
		p.write(w, r, cached, "HIT")
		return
	case found && cached.Age(now) < 2*cached.TTL:
		// Recently expired: answer now, refresh behind the scenes.
		p.Stats.Stale.Add(1)
		p.write(w, r, cached, "STALE")
		go func() { _, _ = p.fetch(req) }()
		return
	}

	p.Stats.Misses.Add(1)
	entry, err := p.fetch(req)
	if err == nil {
		p.write(w, r, entry, "MISS")
		return
	}
	if found {
		p.Stats.Stale.Add(1)
		p.write(w, r, cached, "STALE")
		return
	}
	p.fail(w, err)
}

// fetch collapses concurrent misses for one key into a single upstream call.
// The call runs detached from the client so one cancelled tab does not abort it for everyone.
func (p *Proxy) fetch(req request) (*Entry, error) {
	v, err, _ := p.group.Do(req.key, func() (any, error) {
		ctx, cancel := context.WithTimeout(context.Background(), p.queueTimeout+req.upstream.client.Timeout)
		defer cancel()
		entry, err := req.upstream.Fetch(ctx, p.queueTimeout, req.path, req.query)
		if err != nil {
			return nil, err
		}
		if entry.TTL > 0 {
			p.cache.Set(req.key, entry)
		}
		return entry, nil
	})
	if err != nil {
		return nil, err
	}
	return v.(*Entry), nil
}

func (p *Proxy) parse(r *http.Request) (request, int) {
	rest, ok := strings.CutPrefix(r.URL.Path, "/api/")
	if !ok {
		return request{}, http.StatusNotFound
	}
	name, path, _ := strings.Cut(rest, "/")
	u, ok := p.upstreams[name]
	if !ok {
		return request{}, http.StatusNotFound
	}
	path = "/" + strings.TrimSuffix(path, "/")
	if path == "/" || !safePath.MatchString(path) || strings.Contains(path, "..") {
		return request{}, http.StatusBadRequest
	}
	query := r.URL.Query()
	return request{upstream: u, path: path, query: query, key: name + path + "?" + query.Encode()}, 0
}

func (p *Proxy) write(w http.ResponseWriter, r *http.Request, e *Entry, state string) {
	h := w.Header()
	maps.Copy(h, e.Header)
	now := p.now()
	maxAge := 0
	if state != "STALE" {
		maxAge = int((e.TTL - e.Age(now)).Seconds())
	}
	h.Set("Cache-Control", "public, max-age="+strconv.Itoa(max(maxAge, 0)))
	h.Set("Age", strconv.Itoa(int(e.Age(now).Seconds())))
	h.Set("X-Cache", state)
	h.Set("Content-Length", strconv.Itoa(len(e.Body)))
	w.WriteHeader(e.Status)
	if r.Method != http.MethodHead {
		_, _ = w.Write(e.Body)
	}
}

func (p *Proxy) fail(w http.ResponseWriter, err error) {
	var status *StatusError
	switch {
	case errors.Is(err, ErrBusy):
		w.Header().Set("Retry-After", "5")
		http.Error(w, "upstream busy, try again shortly", http.StatusServiceUnavailable)
	case errors.As(err, &status):
		w.Header().Set("Retry-After", seconds(status.RetryAfter))
		http.Error(w, "upstream unavailable", http.StatusBadGateway)
	default:
		slog.Warn("proxy failure", "err", err)
		http.Error(w, "upstream unreachable", http.StatusBadGateway)
	}
}

func seconds(d time.Duration) string {
	return strconv.Itoa(max(1, int(d.Round(time.Second).Seconds())))
}
