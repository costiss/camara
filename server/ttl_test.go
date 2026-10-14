package main

import (
	"testing"
	"time"
)

func TestSenadoTTLPolicy(t *testing.T) {
	cases := map[string]time.Duration{
		"/plenario/agenda/dia/20261014": 30 * time.Second,
		"/plenario/resultado/20261014":  30 * time.Second,
		"/votacao":                      10 * time.Minute,
		"/votacao?codigoSessao=591267":  10 * time.Minute,
		"/senador/5672/votacoes":        6 * time.Hour,
		"/processo?codigoMateria=174386": time.Hour,
		"/qualquer/outra":               10 * time.Minute,
	}
	for path, want := range cases {
		if got := senadoTTL.For(path); got != want {
			t.Errorf("senadoTTL.For(%q) = %s, want %s", path, got, want)
		}
	}
}

func TestCamaraTTLPolicy(t *testing.T) {
	cases := map[string]time.Duration{
		"/votacoes/2265124-70/votos":  6 * time.Hour,
		"/votacoes/2265124-70":        6 * time.Hour,
		"/votacoes":                   5 * time.Minute,
		"/eventos/83057/pauta":        30 * time.Second,
		"/eventos":                    60 * time.Second,
		"/eventos/83057":              5 * time.Minute,
		"/eventos/83057/votacoes":     10 * time.Minute,
		"/deputados/204379":           6 * time.Hour,
		"/proposicoes/2265124":        time.Hour,
		"/proposicoes/2265124/autores": time.Hour,
	}
	for path, want := range cases {
		if got := camaraTTL.For(path); got != want {
			t.Errorf("camaraTTL.For(%q) = %s, want %s", path, got, want)
		}
	}
}
