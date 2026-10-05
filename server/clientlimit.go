package main

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type visitor struct {
	limiter *rate.Limiter
	seen    time.Time
}

// ClientLimiter gives each client IP its own token bucket so one visitor
// cannot exhaust the shared upstream budget for everyone else.
type ClientLimiter struct {
	mu       sync.Mutex
	rps      rate.Limit
	burst    int
	ips      *ClientIPResolver
	visitors map[string]*visitor
	now      func() time.Time
}

func NewClientLimiter(rps float64, burst int, ips *ClientIPResolver, now func() time.Time) *ClientLimiter {
	return &ClientLimiter{
		rps:      rate.Limit(rps),
		burst:    burst,
		ips:      ips,
		visitors: make(map[string]*visitor),
		now:      now,
	}
}

// Allow spends one token for the request's client; when empty it reports how long to wait.
func (c *ClientLimiter) Allow(r *http.Request) (bool, time.Duration) {
	key := c.ips.Resolve(r)
	now := c.now()
	c.mu.Lock()
	v, ok := c.visitors[key]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(c.rps, c.burst)}
		c.visitors[key] = v
	}
	v.seen = now
	c.mu.Unlock()

	res := v.limiter.ReserveN(now, 1)
	if delay := res.DelayFrom(now); delay > 0 {
		res.CancelAt(now)
		return false, delay
	}
	return true, 0
}

// Sweep forgets clients idle for longer than idle, keeping the map bounded.
func (c *ClientLimiter) Sweep(idle time.Duration) {
	cutoff := c.now().Add(-idle)
	c.mu.Lock()
	defer c.mu.Unlock()
	for k, v := range c.visitors {
		if v.seen.Before(cutoff) {
			delete(c.visitors, k)
		}
	}
}
