"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifKind =
  | "gem"          // new high-tier gem detected
  | "trade"        // AI trading action (open/close/SL/TP)
  | "kol"          // KOL trade alert
  | "ca"           // CA detected from tracked X handle
  | "prediction"   // prediction pool resolved
  | "system"       // generic system message
  | "success"      // green
  | "error";       // red

export type NotifSeverity = "info" | "success" | "warn" | "error";

export interface Notification {
  id:       string;
  kind:     NotifKind;
  severity: NotifSeverity;
  title:    string;
  body?:    string;
  href?:    string;   // optional external link
  tab?:     string;   // optional internal tab to navigate to
  ts:       number;   // ms epoch
  read:     boolean;
  meta?:    Record<string, unknown>;
}

// ── Module-level store (singleton) ────────────────────────────────────────────

const STORAGE_KEY = "geass:notifications";
const MAX_NOTIFICATIONS = 100;

let store: Notification[] = [];
let initialized = false;
const listeners = new Set<(n: Notification[]) => void>();

function load(): Notification[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function save() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store.slice(0, MAX_NOTIFICATIONS))); } catch {}
}

function init() {
  if (initialized) return;
  store = load();
  initialized = true;
}

function emit() {
  for (const l of listeners) l(store);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function pushNotification(n: Omit<Notification, "id" | "ts" | "read">) {
  init();
  const notif: Notification = {
    ...n,
    id:   `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts:   Date.now(),
    read: false,
  };
  store = [notif, ...store].slice(0, MAX_NOTIFICATIONS);
  save(); emit();
  return notif;
}

export function markRead(id: string) {
  init();
  store = store.map(n => n.id === id ? { ...n, read: true } : n);
  save(); emit();
}

export function markAllRead() {
  init();
  store = store.map(n => ({ ...n, read: true }));
  save(); emit();
}

export function clearOne(id: string) {
  init();
  store = store.filter(n => n.id !== id);
  save(); emit();
}

export function clearAll() {
  init();
  store = [];
  save(); emit();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount:   number;
  push:          typeof pushNotification;
  markRead:      typeof markRead;
  markAllRead:   typeof markAllRead;
  clearOne:      typeof clearOne;
  clearAll:      typeof clearAll;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    init();
    return store;
  });

  useEffect(() => {
    init();
    setNotifications(store);
    const l = (n: Notification[]) => setNotifications(n);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    push: pushNotification,
    markRead,
    markAllRead,
    clearOne,
    clearAll,
  };
}
