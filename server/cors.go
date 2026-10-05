package main

import (
	"net/http"
	"slices"
)

// CORS answers preflights and stamps allowed origins on every response, so the
// browser no longer depends on the government servers sending these headers.
type CORS struct {
	origins []string
	next    http.Handler
}

func NewCORS(origins []string, next http.Handler) *CORS {
	return &CORS{origins: origins, next: next}
}

func (c *CORS) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Add("Vary", "Origin")
	if origin := r.Header.Get("Origin"); origin != "" {
		if slices.Contains(c.origins, "*") {
			h.Set("Access-Control-Allow-Origin", "*")
		} else if slices.Contains(c.origins, origin) {
			h.Set("Access-Control-Allow-Origin", origin)
		}
		h.Set("Access-Control-Expose-Headers", "X-Total-Count, Link, X-Cache, Retry-After")
	}
	if r.Method == http.MethodOptions {
		h.Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
		h.Set("Access-Control-Allow-Headers", "Accept, Content-Type")
		h.Set("Access-Control-Max-Age", "86400")
		w.WriteHeader(http.StatusNoContent)
		return
	}
	c.next.ServeHTTP(w, r)
}
