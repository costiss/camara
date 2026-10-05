package main

import (
	"container/list"
	"net/http"
	"sync"
	"time"
)

// Entry is one cached upstream response.
type Entry struct {
	Status   int
	Header   http.Header
	Body     []byte
	StoredAt time.Time
	TTL      time.Duration
}

func (e *Entry) Age(now time.Time) time.Duration { return now.Sub(e.StoredAt) }

func (e *Entry) Fresh(now time.Time) bool { return e.Age(now) < e.TTL }

func (e *Entry) size() int64 {
	n := int64(len(e.Body)) + 256
	for k, vs := range e.Header {
		n += int64(len(k))
		for _, v := range vs {
			n += int64(len(v))
		}
	}
	return n
}

type CacheStats struct {
	Entries int   `json:"entries"`
	Bytes   int64 `json:"bytes"`
}

// Cache stores responses by normalised upstream URL.
type Cache interface {
	Get(key string) (*Entry, bool)
	Set(key string, e *Entry)
	Stats() CacheStats
}

type lruItem struct {
	key   string
	entry *Entry
}

// MemoryCache is a size-bounded LRU. Entries outlive their TTL by maxStale
// so they can still be served when an upstream is down.
type MemoryCache struct {
	mu       sync.Mutex
	maxBytes int64
	maxStale time.Duration
	bytes    int64
	order    *list.List
	items    map[string]*list.Element
	now      func() time.Time
}

func NewMemoryCache(maxBytes int64, maxStale time.Duration, now func() time.Time) *MemoryCache {
	return &MemoryCache{
		maxBytes: maxBytes,
		maxStale: maxStale,
		order:    list.New(),
		items:    make(map[string]*list.Element),
		now:      now,
	}
}

func (c *MemoryCache) Get(key string) (*Entry, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.items[key]
	if !ok {
		return nil, false
	}
	e := el.Value.(*lruItem).entry
	if e.Age(c.now()) > e.TTL+c.maxStale {
		c.remove(el)
		return nil, false
	}
	c.order.MoveToFront(el)
	return e, true
}

func (c *MemoryCache) Set(key string, e *Entry) {
	size := e.size()
	if size > c.maxBytes/8 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		c.remove(el)
	}
	c.items[key] = c.order.PushFront(&lruItem{key: key, entry: e})
	c.bytes += size
	for c.bytes > c.maxBytes {
		c.remove(c.order.Back())
	}
}

func (c *MemoryCache) Stats() CacheStats {
	c.mu.Lock()
	defer c.mu.Unlock()
	return CacheStats{Entries: len(c.items), Bytes: c.bytes}
}

func (c *MemoryCache) remove(el *list.Element) {
	item := c.order.Remove(el).(*lruItem)
	delete(c.items, item.key)
	c.bytes -= item.entry.size()
}
