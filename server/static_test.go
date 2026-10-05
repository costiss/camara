package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newSPA(t *testing.T) http.Handler {
	t.Helper()
	dir := t.TempDir()
	write := func(name, body string) {
		p := filepath.Join(dir, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("index.html", "<!doctype html><title>app</title>")
	write("assets/index-abc123.js", "console.log(1)")
	write("favicon.svg", "<svg/>")
	return NewSPA(dir)
}

func serve(h http.Handler, method, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestSPAServesIndexWithoutCaching(t *testing.T) {
	rec := serve(newSPA(t), http.MethodGet, "/")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "<title>app</title>") {
		t.Fatalf("got %d %q", rec.Code, rec.Body.String())
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "no-cache" {
		t.Fatalf("Cache-Control = %q", cc)
	}
	if loc := rec.Header().Get("Location"); loc != "" {
		t.Fatalf("unexpected redirect to %q", loc)
	}
}

func TestSPACachesHashedAssets(t *testing.T) {
	rec := serve(newSPA(t), http.MethodGet, "/assets/index-abc123.js")
	if rec.Code != 200 || !strings.Contains(rec.Header().Get("Cache-Control"), "immutable") {
		t.Fatalf("got %d Cache-Control=%q", rec.Code, rec.Header().Get("Cache-Control"))
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "javascript") {
		t.Fatalf("Content-Type = %q", ct)
	}
}

func TestSPAFallbackAndMissingFiles(t *testing.T) {
	h := newSPA(t)
	if rec := serve(h, http.MethodGet, "/votacoes/camara-1"); rec.Code != 200 || !strings.Contains(rec.Body.String(), "app") {
		t.Fatalf("extension-less path should fall back to index.html, got %d", rec.Code)
	}
	if rec := serve(h, http.MethodGet, "/assets/missing.js"); rec.Code != 404 {
		t.Fatalf("missing asset got %d, want 404", rec.Code)
	}
	if rec := serve(h, http.MethodGet, "/index.html"); rec.Code != 200 || rec.Header().Get("Location") != "" {
		t.Fatalf("/index.html got %d Location=%q", rec.Code, rec.Header().Get("Location"))
	}
}

func TestSPAPathTraversal(t *testing.T) {
	h := newSPA(t)
	for _, p := range []string{"/../../etc/passwd", "/%2e%2e/%2e%2e/etc/passwd", "/assets/../../etc/hosts"} {
		rec := serve(h, http.MethodGet, p)
		if strings.Contains(rec.Body.String(), "root:") || strings.Contains(rec.Body.String(), "localhost") {
			t.Fatalf("%s leaked a file outside the root", p)
		}
	}
}

func TestSameOriginByDefaultSendsNoCORS(t *testing.T) {
	h := NewCORS(nil, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(204) }))
	req := httptest.NewRequest(http.MethodGet, "/api/camara/votacoes", nil)
	req.Header.Set("Origin", "https://other.example")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("CORS header sent without PROXY_ALLOWED_ORIGINS")
	}
}
