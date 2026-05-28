"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNotifications, type Notification, type NotifKind } from "@/lib/useNotifications";
import {
  IconBell, IconX, IconArrowUpRight, IconCheck,
  IconRocket, IconBot, IconBroadcast, IconGlobe, IconTarget,
} from "./icons";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";

const KIND_META: Record<NotifKind, { color: string; Icon: React.FC<{ size?: number }> }> = {
  gem:        { color: "#10b981", Icon: IconRocket },
  trade:      { color: "#ff2b4e", Icon: IconBot },
  kol:        { color: "#a855f7", Icon: IconBroadcast },
  ca:         { color: "#06b6d4", Icon: IconGlobe },
  prediction: { color: "#eab308", Icon: IconTarget },
  system:     { color: "#71717a", Icon: IconBell },
  success:    { color: "#10b981", Icon: IconCheck },
  error:      { color: "#ef4444", Icon: IconX },
};

function fmtAgo(ms: number) {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface NotificationsBellProps {
  isMobile?:   boolean;
  onNavigate?: (tab: string) => void;
}

export function NotificationsBell({ isMobile = false, onNavigate }: NotificationsBellProps) {
  const { notifications, unreadCount, markRead, markAllRead, clearOne, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node))   return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.tab && onNavigate) { onNavigate(n.tab); setOpen(false); }
    else if (n.href) { window.open(n.href, "_blank", "noreferrer"); }
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{
          background:   open ? "#ff2b4e14" : "transparent",
          border:       `1px solid ${open ? "#ff2b4e" : "#27272a"}`,
          color:        open ? "#ff2b4e" : "#a1a1aa",
          width:        isMobile ? 30 : 32,
          height:       isMobile ? 30 : 32,
          borderRadius: 7,
          cursor:       "pointer",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          position:     "relative",
          transition:   "color .15s, background .15s, border-color .15s",
        }}
      >
        <IconBell size={isMobile ? 14 : 15} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: -3, right: -3,
            background: "#ff2b4e",
            color: "#fff",
            fontSize: 8,
            fontWeight: 800,
            minWidth: 14, height: 14,
            padding: "0 3px",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1.5px solid #08080d",
            fontFamily: MONO,
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position:    "absolute",
            top:         "calc(100% + 6px)",
            right:       0,
            width:       isMobile ? "calc(100vw - 28px)" : 380,
            maxWidth:    isMobile ? 360 : 380,
            maxHeight:   "70vh",
            background:  "#0a0a0c",
            border:      "1px solid #1e1e21",
            borderRadius: 10,
            boxShadow:   "0 12px 40px #00000099",
            zIndex:      300,
            overflow:    "hidden",
            display:     "flex",
            flexDirection: "column",
            fontFamily:  MONO,
          }}
        >
          {/* Header */}
          <div style={{
            padding: "11px 14px",
            borderBottom: "1px solid #18181c",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0c0c0e",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconBell size={13} style={{ color: "#ff2b4e" }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#f4f4f5", letterSpacing: "0.5px" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background: "#ff2b4e", color: "#fff", fontSize: 9, fontWeight: 700,
                  padding: "1px 6px", borderRadius: 8,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  style={{
                    background: "transparent", border: "1px solid #27272a",
                    color: "#71717a", fontSize: 9, fontWeight: 600,
                    padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                    fontFamily: MONO, display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <IconCheck size={9} /> Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  style={{
                    background: "transparent", border: "1px solid #27272a",
                    color: "#71717a", fontSize: 9, fontWeight: 600,
                    padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                    fontFamily: MONO,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: "44px 20px",
                textAlign: "center",
                color: "#3f3f46",
                fontSize: 11,
              }}>
                <IconBell size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.2 }} />
                No notifications yet.<br />
                <span style={{ fontSize: 10, color: "#27272a" }}>
                  GEASS alerts will appear here.
                </span>
              </div>
            ) : (
              notifications.map(n => {
                const meta = KIND_META[n.kind];
                const c = n.severity === "error"   ? "#ef4444"
                        : n.severity === "warn"    ? "#f59e0b"
                        : n.severity === "success" ? "#10b981"
                        : meta.color;
                const Icon = meta.Icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "10px 14px 10px 18px",
                      borderBottom: "1px solid #111114",
                      cursor: n.tab || n.href ? "pointer" : "default",
                      background: n.read ? "transparent" : "#ff2b4e08",
                      transition: "background .15s",
                      position: "relative",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = n.read ? "#0d0d10" : "#ff2b4e12"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.read ? "transparent" : "#ff2b4e08"; }}
                  >
                    {/* Unread dot */}
                    {!n.read && (
                      <div style={{
                        position: "absolute", left: 6, top: "50%",
                        transform: "translateY(-50%)",
                        width: 4, height: 4, borderRadius: "50%",
                        background: "#ff2b4e",
                      }} />
                    )}
                    {/* Icon */}
                    <div style={{
                      width: 28, height: 28, flexShrink: 0,
                      borderRadius: 6,
                      background: `${c}1a`,
                      border: `1px solid ${c}44`,
                      color: c,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Icon size={13} />
                    </div>
                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: n.read ? "#a1a1aa" : "#f4f4f5",
                        marginBottom: 2,
                        wordBreak: "break-word",
                      }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{
                          fontSize: 10.5,
                          color: "#71717a",
                          lineHeight: 1.45,
                          wordBreak: "break-word",
                        }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginTop: 4, fontSize: 9, color: "#3f3f46",
                      }}>
                        <span>{fmtAgo(n.ts)}</span>
                        {n.tab && (
                          <>
                            <span>·</span>
                            <span style={{ color: c, fontWeight: 700, textTransform: "uppercase" }}>
                              {n.tab}
                            </span>
                          </>
                        )}
                        {n.href && <IconArrowUpRight size={9} style={{ marginLeft: "auto" }} />}
                      </div>
                    </div>
                    {/* Dismiss */}
                    <button
                      onClick={e => { e.stopPropagation(); clearOne(n.id); }}
                      aria-label="Dismiss"
                      style={{
                        background: "transparent", border: "none",
                        color: "#3f3f46", cursor: "pointer",
                        padding: 2, alignSelf: "flex-start",
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <IconX size={10} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          {notifications.length > 0 && (
            <div style={{
              padding: "8px 14px",
              borderTop: "1px solid #18181c",
              background: "#08080a",
              fontSize: 9,
              color: "#3f3f46",
              textAlign: "center",
              letterSpacing: "0.06em",
            }}>
              {notifications.length} total · stored locally
            </div>
          )}
        </div>
      )}
    </div>
  );
}
