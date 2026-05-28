"use client";

import { useState, useCallback } from "react";

// ── KOL CA Watcher ────────────────────────────────────────────────────────────

export interface KolHit {
  handle: string;
  ca:     string;
  url:    string;
  ts:     number;
}

export function useKolWatch(handles: string[]) {
  const [hits, setHits]       = useState<KolHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (!handles.length) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/firecrawl/kol-watch?handles=${handles.map(h => h.replace(/^@/, "")).join(",")}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "kol-watch failed");
      setHits(j.hits ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [handles.join(",")]);  // eslint-disable-line react-hooks/exhaustive-deps

  return { hits, loading, error, scan };
}

// ── Gem CA Scraper ────────────────────────────────────────────────────────────

export interface GemsResult {
  cas:       string[];
  total:     number;
  fetchedAt: number;
}

export function useGems() {
  const [result, setResult]   = useState<GemsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchGems = useCallback(async (source: "all" | "dexscreener" | "pump" = "all") => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/firecrawl/gems?source=${source}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "gems fetch failed");
      setResult(j);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, fetchGems };
}

// ── Competitor Tracker ────────────────────────────────────────────────────────

export interface CompetitorResult {
  name:      string;
  url:       string;
  snippet:   string;
  changed:   boolean;
  fetchedAt: number;
}

export function useCompetitors() {
  const [results, setResults] = useState<CompetitorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/firecrawl/competitors");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "competitor scan failed");
      setResults(j.results ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, scan };
}

// ── Knowledge Base Search ─────────────────────────────────────────────────────

export interface KbHit {
  url:          string;
  title?:       string;
  description?: string;
  markdown?:    string;
}

export function useKbSearch() {
  const [results, setResults] = useState<KbHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/firecrawl/kb?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "kb search failed");
      setResults(j.results ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
