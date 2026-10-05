package main

import (
	"errors"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// SPA serves the built web app. Hashed assets are cached forever, index.html is
// always revalidated, and unknown extension-less paths fall back to index.html.
// It never redirects, so no absolute URL depends on the host the proxy saw.
type SPA struct {
	root string
}

func NewSPA(root string) *SPA { return &SPA{root: root} }

func (s *SPA) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	h := w.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Referrer-Policy", "strict-origin-when-cross-origin")

	clean := path.Clean("/" + r.URL.Path)
	name := clean
	f, info, err := s.open(name)
	if err != nil || info.IsDir() {
		if f != nil {
			f.Close()
		}
		if path.Ext(clean) != "" {
			http.NotFound(w, r)
			return
		}
		name = "/index.html"
		if f, info, err = s.open(name); err != nil {
			http.Error(w, "app not built", http.StatusServiceUnavailable)
			return
		}
	}
	defer f.Close()

	if strings.HasPrefix(name, "/assets/") {
		h.Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		h.Set("Cache-Control", "no-cache")
	}
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}

func (s *SPA) open(name string) (*os.File, fs.FileInfo, error) {
	f, err := os.Open(filepath.Join(s.root, filepath.FromSlash(name)))
	if err != nil {
		return nil, nil, err
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, nil, errors.Join(err, fs.ErrNotExist)
	}
	return f, info, nil
}
