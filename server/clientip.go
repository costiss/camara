package main

import (
	"net"
	"net/http"
	"net/netip"
	"slices"
	"strings"
)

// Cloudflare edge ranges, from https://www.cloudflare.com/ips/.
var cloudflareRanges = mustPrefixes(
	"173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
	"141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
	"197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
	"104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
	"2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
	"2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
)

// Where a reverse proxy in front of us (Traefik, Docker networking) connects from.
const defaultTrustedProxies = "127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,::1/128,fc00::/7"

// ClientIPResolver finds the visitor's address behind Cloudflare and a reverse
// proxy without trusting headers a client could forge.
type ClientIPResolver struct {
	trusted    []netip.Prefix
	cloudflare []netip.Prefix
}

func NewClientIPResolver(trusted []netip.Prefix, trustCloudflare bool) *ClientIPResolver {
	r := &ClientIPResolver{trusted: trusted}
	if trustCloudflare {
		r.cloudflare = cloudflareRanges
	}
	return r
}

// Resolve walks X-Forwarded-For from the nearest hop outwards while hops are trusted
// proxies or Cloudflare edges. CF-Connecting-IP is used only when the last verified
// hop is a Cloudflare edge, which covers proxies that overwrite X-Forwarded-For.
func (r *ClientIPResolver) Resolve(req *http.Request) string {
	ip, ok := parseAddr(req.RemoteAddr)
	if !ok {
		return req.RemoteAddr
	}
	hops := strings.Split(req.Header.Get("X-Forwarded-For"), ",")
	for i := len(hops) - 1; i >= 0 && r.isProxy(ip); i-- {
		next, ok := parseAddr(hops[i])
		if !ok {
			break
		}
		ip = next
	}
	if r.isCloudflare(ip) {
		if cf, ok := parseAddr(req.Header.Get("CF-Connecting-IP")); ok {
			ip = cf
		}
	}
	return ip.String()
}

func (r *ClientIPResolver) isProxy(ip netip.Addr) bool {
	return containsAddr(r.trusted, ip) || r.isCloudflare(ip)
}

func (r *ClientIPResolver) isCloudflare(ip netip.Addr) bool {
	return containsAddr(r.cloudflare, ip)
}

func containsAddr(prefixes []netip.Prefix, ip netip.Addr) bool {
	return slices.ContainsFunc(prefixes, func(p netip.Prefix) bool { return p.Contains(ip) })
}

func parseAddr(s string) (netip.Addr, bool) {
	s = strings.TrimSpace(s)
	if host, _, err := net.SplitHostPort(s); err == nil {
		s = host
	}
	ip, err := netip.ParseAddr(s)
	if err != nil {
		return netip.Addr{}, false
	}
	return ip.Unmap(), true
}

func parsePrefixes(list []string) ([]netip.Prefix, error) {
	out := make([]netip.Prefix, 0, len(list))
	for _, s := range list {
		p, err := netip.ParsePrefix(strings.TrimSpace(s))
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

func mustPrefixes(list ...string) []netip.Prefix {
	out, err := parsePrefixes(list)
	if err != nil {
		panic(err)
	}
	return out
}
