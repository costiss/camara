package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = c.t.Add(d)
}

type fixture struct {
	t        *testing.T
	proxy    *Proxy
	handler  http.Handler
	clock    *fakeClock
	calls    atomic.Int64
	status   atomic.Int64
	lastPath atomic.Value
}

type options struct {
	rps, clientRPS     float64
	burst, clientBurst int
	delay              time.Duration
}

func newFixture(t *testing.T, opt options) *fixture {
	t.Helper()
	f := &fixture{t: t, clock: &fakeClock{t: time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)}}
	f.status.Store(http.StatusOK)
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.calls.Add(1)
		f.lastPath.Store(r.URL.RequestURI())
		if opt.delay > 0 {
			time.Sleep(opt.delay)
		}
		status := int(f.status.Load())
		if status == http.StatusTooManyRequests {
			w.Header().Set("Retry-After", "30")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Total-Count", "42")
		w.WriteHeader(status)
		_, _ = io.WriteString(w, `{"dados":[]}`)
	}))
	t.Cleanup(api.Close)

	if opt.rps == 0 {
		opt.rps, opt.burst = 1000, 1000
	}
	if opt.clientRPS == 0 {
		opt.clientRPS, opt.clientBurst = 1000, 1000
	}
	up, err := NewUpstream("camara", UpstreamConfig{Base: api.URL + "/api/v2", RPS: opt.rps, Burst: opt.burst, MaxConcurrent: 4}, camaraTTL, 5*time.Second, f.clock.Now)
	if err != nil {
		t.Fatal(err)
	}
	cache := NewMemoryCache(64<<20, 24*time.Hour, f.clock.Now)
	clients := NewClientLimiter(opt.clientRPS, opt.clientBurst, false, f.clock.Now)
	f.proxy = NewProxy([]*Upstream{up}, cache, clients, 2*time.Second, f.clock.Now)
	f.handler = NewCORS([]string{"*"}, f.proxy)
	return f
}

func (f *fixture) get(path string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()
	f.handler.ServeHTTP(rec, req)
	return rec
}

func (f *fixture) eventually(cond func() bool) {
	f.t.Helper()
	for range 100 {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	f.t.Fatal("condition not met in time")
}

func TestCachesAndForwardsHeaders(t *testing.T) {
	f := newFixture(t, options{})
	first := f.get("/api/camara/votacoes?idOrgao=180")
	second := f.get("/api/camara/votacoes?idOrgao=180")

	if first.Code != 200 || first.Header().Get("X-Cache") != "MISS" {
		t.Fatalf("first: %d %s", first.Code, first.Header().Get("X-Cache"))
	}
	if second.Header().Get("X-Cache") != "HIT" {
		t.Fatalf("second X-Cache = %s", second.Header().Get("X-Cache"))
	}
	if n := f.calls.Load(); n != 1 {
		t.Fatalf("upstream calls = %d, want 1", n)
	}
	if got := second.Header().Get("X-Total-Count"); got != "42" {
		t.Fatalf("X-Total-Count = %q", got)
	}
	if got := second.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("CORS origin = %q", got)
	}
	if got := f.lastPath.Load().(string); got != "/api/v2/votacoes?idOrgao=180" {
		t.Fatalf("upstream path = %q", got)
	}
}

func TestQueryOrderSharesCacheEntry(t *testing.T) {
	f := newFixture(t, options{})
	f.get("/api/camara/eventos?dataInicio=2026-10-01&dataFim=2026-10-05")
	rec := f.get("/api/camara/eventos?dataFim=2026-10-05&dataInicio=2026-10-01")
	if rec.Header().Get("X-Cache") != "HIT" || f.calls.Load() != 1 {
		t.Fatalf("X-Cache = %s, calls = %d", rec.Header().Get("X-Cache"), f.calls.Load())
	}
}

func TestCoalescesConcurrentMisses(t *testing.T) {
	f := newFixture(t, options{delay: 100 * time.Millisecond})
	var wg sync.WaitGroup
	for range 20 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if rec := f.get("/api/camara/deputados"); rec.Code != 200 {
				t.Errorf("status %d", rec.Code)
			}
		}()
	}
	wg.Wait()
	if n := f.calls.Load(); n != 1 {
		t.Fatalf("upstream calls = %d, want 1", n)
	}
}

func TestServesStaleWhileRevalidating(t *testing.T) {
	f := newFixture(t, options{})
	f.get("/api/camara/votacoes")
	f.clock.Advance(6 * time.Minute) // TTL for /votacoes is 5 min

	rec := f.get("/api/camara/votacoes")
	if rec.Header().Get("X-Cache") != "STALE" {
		t.Fatalf("X-Cache = %s, want STALE", rec.Header().Get("X-Cache"))
	}
	f.eventually(func() bool { return f.calls.Load() == 2 })
	f.eventually(func() bool { return f.get("/api/camara/votacoes").Header().Get("X-Cache") == "HIT" })
}

func TestServesStaleWhenUpstreamFails(t *testing.T) {
	f := newFixture(t, options{})
	f.get("/api/camara/deputados")
	f.clock.Advance(13 * time.Hour) // past TTL and the revalidation window
	f.status.Store(http.StatusInternalServerError)

	rec := f.get("/api/camara/deputados")
	if rec.Code != 200 || rec.Header().Get("X-Cache") != "STALE" {
		t.Fatalf("got %d %s, want 200 STALE", rec.Code, rec.Header().Get("X-Cache"))
	}
}

func TestUpstream429PausesThatAPI(t *testing.T) {
	f := newFixture(t, options{})
	f.status.Store(http.StatusTooManyRequests)
	rec := f.get("/api/camara/proposicoes?id=1")
	if rec.Code != http.StatusBadGateway || rec.Header().Get("Retry-After") != "30" {
		t.Fatalf("got %d Retry-After=%q", rec.Code, rec.Header().Get("Retry-After"))
	}
	if wait := f.proxy.upstreams["camara"].pausedFor(); wait < 29*time.Second {
		t.Fatalf("paused for %s, want ~30s", wait)
	}
}

func TestGlobalUpstreamRateLimit(t *testing.T) {
	f := newFixture(t, options{rps: 1, burst: 1})
	f.clock.Advance(0)
	if rec := f.get("/api/camara/proposicoes?id=1"); rec.Code != 200 {
		t.Fatalf("first status %d", rec.Code)
	}
	// The bucket refills on wall-clock time inside x/time/rate, so the second distinct
	// request has to wait ~1s; it must still be served, but not instantly.
	start := time.Now()
	if rec := f.get("/api/camara/proposicoes?id=2"); rec.Code != 200 {
		t.Fatalf("second status %d", rec.Code)
	}
	if waited := time.Since(start); waited < 800*time.Millisecond {
		t.Fatalf("second upstream call after %s, want it throttled to ~1s", waited)
	}
}

func TestClientRateLimit(t *testing.T) {
	f := newFixture(t, options{clientRPS: 0.001, clientBurst: 2})
	f.get("/api/camara/partidos")
	f.get("/api/camara/partidos")
	rec := f.get("/api/camara/partidos")
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("got %d Retry-After=%q", rec.Code, rec.Header().Get("Retry-After"))
	}
	if n := f.calls.Load(); n != 1 {
		t.Fatalf("upstream calls = %d, want 1", n)
	}
}

func TestRejectsUnknownUpstreamsAndUnsafePaths(t *testing.T) {
	f := newFixture(t, options{})
	cases := map[string]int{
		"/api/google/search":            http.StatusNotFound,
		"/api/camara/":                  http.StatusBadRequest,
		"/api/camara/../../etc/passwd":  http.StatusBadRequest,
		"/api/camara/votacoes%2F..%2Fx": http.StatusBadRequest,
		"/other":                        http.StatusNotFound,
	}
	for path, want := range cases {
		if rec := f.get(path); rec.Code != want {
			t.Errorf("%s: got %d, want %d", path, rec.Code, want)
		}
	}
	if f.calls.Load() != 0 {
		t.Fatalf("unsafe requests reached upstream")
	}
	req := httptest.NewRequest(http.MethodPost, "/api/camara/votacoes", nil)
	rec := httptest.NewRecorder()
	f.handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST got %d", rec.Code)
	}
}

func TestPreflight(t *testing.T) {
	f := newFixture(t, options{})
	req := httptest.NewRequest(http.MethodOptions, "/api/camara/votacoes", nil)
	req.Header.Set("Origin", "https://example.org")
	rec := httptest.NewRecorder()
	f.handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Methods") == "" {
		t.Fatalf("preflight got %d %v", rec.Code, rec.Header())
	}
}

func TestNegativeCachingOfClientErrors(t *testing.T) {
	f := newFixture(t, options{})
	f.status.Store(http.StatusBadRequest)
	f.get("/api/camara/proposicoes?bogus=1")
	rec := f.get("/api/camara/proposicoes?bogus=1")
	if rec.Code != http.StatusBadRequest || rec.Header().Get("X-Cache") != "HIT" || f.calls.Load() != 1 {
		t.Fatalf("got %d %s calls=%d", rec.Code, rec.Header().Get("X-Cache"), f.calls.Load())
	}
}

func TestCacheEvictsLeastRecentlyUsed(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	c := NewMemoryCache(8<<10, time.Hour, clock.Now)
	body := make([]byte, 600) // ~856 bytes each with overhead: 9 fit in 8 KiB
	for _, k := range []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"} {
		c.Set(k, &Entry{Status: 200, Body: body, StoredAt: clock.Now(), TTL: time.Minute})
		if k == "e" {
			c.Get("a") // touch so it survives
		}
	}
	if _, ok := c.Get("a"); !ok {
		t.Fatal("recently used entry evicted")
	}
	if _, ok := c.Get("b"); ok {
		t.Fatal("least recently used entry kept")
	}
	if s := c.Stats(); s.Bytes > 8<<10 {
		t.Fatalf("cache over budget: %d bytes", s.Bytes)
	}
}
