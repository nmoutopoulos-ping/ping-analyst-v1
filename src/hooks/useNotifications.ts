import { useState, useEffect, useCallback } from "react";
import { getApiKey } from "@/lib/api";
import type { Notification } from "@/lib/types";

const SB_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://knimxvcbrtkuhsuovasu.supabase.co";

const SB_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaW14dmNicnRrdWhzdW92YXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDEyNjAsImV4cCI6MjA4OTE3NzI2MH0.g3Gcz-c41C9jnxy5Gba_jzrV1ATjy5_Wr5yaIXOHY8M";

const H: Record<string, string> = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const apiKey = getApiKey();

  const fetchNotifications = useCallback(async () => {
    if (!apiKey) return;
    try {
      const r = await fetch(
        `${SB_URL}/rest/v1/notifications?api_key=eq.${encodeURIComponent(apiKey)}&order=created_at.desc&limit=20`,
        { headers: H }
      );
      if (r.ok) {
        const data = await r.json();
        setNotifications(data);
      }
    } catch {
      // silent
    }
  }, [apiKey]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${SB_URL}/rest/v1/notifications?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    if (!apiKey) return;
    try {
      await fetch(
        `${SB_URL}/rest/v1/notifications?api_key=eq.${encodeURIComponent(apiKey)}&read=eq.false`,
        {
          method: "PATCH",
          headers: { ...H, Prefer: "return=representation" },
          body: JSON.stringify({ read: true }),
        }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent
    }
  };

  return { notifications, unreadCount, markAsRead, markAllRead, refetch: fetchNotifications };
}
