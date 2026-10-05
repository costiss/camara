package main

import (
	"net/http"
	"slices"
)

// CORS opens the API to other origins listed in PROXY_ALLOWED_ORIGINS. The app
// itself is same-origin, so with the default empty list no CORS headers are sent.
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
	if origin := r.Header.Get("Origin"); origin != "" && len(c.origins) > 0 {
		if slices.Contains(c.origins, "*") {
			h.Set("Access-Control-Allow-Origin", "*")
		} else if slices.Contains(c.origins, origin) {
			h.Set("Access-Control-Allow-Origin", origin)
		}
		h.Set("Access-Control-Expose-Headers", "X-Total-Count, Link, X-Cache, Retry-After")
	}
	if r.Method == http.MethodOptions && len(c.origins) > 0 {
		h.Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
		h.Set("Access-Control-Allow-Headers", "Accept, Content-Type")
		h.Set("Access-Control-Max-Age", "86400")
		w.WriteHeader(http.StatusNoContent)
		return
	}
	c.next.ServeHTTP(w, r)
}
