package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClientIPResolver(t *testing.T) {
	trusted := mustPrefixes(strings.Split(defaultTrustedProxies, ",")...)
	r := NewClientIPResolver(trusted, true)
	const traefik = "172.18.0.5:41234" // Dokploy's Traefik on the Docker network
	const edge = "172.70.10.20"        // a Cloudflare edge (172.64.0.0/13)

	cases := []struct {
		name   string
		remote string
		xff    string
		cf     string
		want   string
	}{
		{"direct visitor", "203.0.113.9:5000", "", "", "203.0.113.9"},
		{"direct visitor forging headers", "203.0.113.9:5000", "1.1.1.1", "8.8.8.8", "203.0.113.9"},
		{"via Traefik, client spoofing XFF", traefik, "1.1.1.1, 203.0.113.9", "", "203.0.113.9"},
		{"Cloudflare then Traefik appending XFF", traefik, "198.51.100.4, " + edge, "198.51.100.4", "198.51.100.4"},
		{"Cloudflare then Traefik overwriting XFF", traefik, edge, "198.51.100.4", "198.51.100.4"},
		{"spoofed CF-Connecting-IP not from Cloudflare", traefik, "203.0.113.9", "8.8.8.8", "203.0.113.9"},
		{"client spoofing XFF through Cloudflare", traefik, "1.1.1.1, 198.51.100.4, " + edge, "198.51.100.4", "198.51.100.4"},
		{"IPv6 visitor via Cloudflare", traefik, "2606:4700::1", "2001:db8::7", "2001:db8::7"},
		{"garbage XFF", traefik, "not-an-ip", "", "172.18.0.5"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/camara/votacoes", nil)
			req.RemoteAddr = c.remote
			if c.xff != "" {
				req.Header.Set("X-Forwarded-For", c.xff)
			}
			if c.cf != "" {
				req.Header.Set("CF-Connecting-IP", c.cf)
			}
			if got := r.Resolve(req); got != c.want {
				t.Fatalf("got %s, want %s", got, c.want)
			}
		})
	}
}

func TestClientIPWithoutCloudflareTrust(t *testing.T) {
	r := NewClientIPResolver(mustPrefixes("172.16.0.0/12"), false)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "172.18.0.5:1"
	req.Header.Set("X-Forwarded-For", "172.70.10.20")
	req.Header.Set("CF-Connecting-IP", "198.51.100.4")
	if got := r.Resolve(req); got != "172.70.10.20" {
		t.Fatalf("got %s, want the edge address when Cloudflare is not trusted", got)
	}
}
