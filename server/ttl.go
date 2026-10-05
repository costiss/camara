package main

import (
	"regexp"
	"time"
)

type TTLRule struct {
	Pattern *regexp.Regexp
	TTL     time.Duration
}

// TTLPolicy maps an upstream path to how long its response stays fresh.
type TTLPolicy struct {
	Rules    []TTLRule
	Fallback time.Duration
}

func (p TTLPolicy) For(path string) time.Duration {
	for _, r := range p.Rules {
		if r.Pattern.MatchString(path) {
			return r.TTL
		}
	}
	return p.Fallback
}

func rule(pattern string, ttl time.Duration) TTLRule {
	return TTLRule{Pattern: regexp.MustCompile(pattern), TTL: ttl}
}

// A recorded roll-call does not change; lists of recent activity do.
var camaraTTL = TTLPolicy{
	Rules: []TTLRule{
		rule(`^/votacoes/[^/]+/(votos|orientacoes)$`, 6*time.Hour),
		rule(`^/votacoes/[^/]+$`, 6*time.Hour),
		rule(`^/votacoes$`, 5*time.Minute),
		rule(`^/eventos`, 10*time.Minute),
		rule(`^/deputados`, 6*time.Hour),
		rule(`^/partidos`, 24*time.Hour),
		rule(`^/proposicoes/[^/]+/tramitacoes$`, 30*time.Minute),
		rule(`^/proposicoes`, time.Hour),
	},
	Fallback: 10 * time.Minute,
}

var senadoTTL = TTLPolicy{
	Rules: []TTLRule{
		rule(`^/votacao`, 10*time.Minute),
		rule(`^/senador`, 6*time.Hour),
		rule(`^/processo`, time.Hour),
	},
	Fallback: 10 * time.Minute,
}

// Client errors are cached briefly so a bad link cannot hammer upstream.
const negativeTTL = time.Minute
