import { useState, useEffect, useCallback } from "react";
import { getApiKey } from "@/lib/api";
import type { Notification } from "@/lib/types";
import {
  supabaseGetNotifications,
  supabaseMarkNotificationRead,
  supabaseMarkAllNotificationsRead,
} from "@/lib/supabase";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const apiKey = getApiKey();

  const fetchNotifications = useCallback(async () => {
    if (!apiKey) return;
    try {
      const data = await supabaseGetNotifications(apiKey);
      setNotifications(data);
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
      await supabaseMarkNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    if (!apiKey) return;
    try {
      await supabaseMarkAllNotificationsRead(apiKey);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent
    }
  };

  return { notifications, unreadCount, markAsRead, markAllRead, refetch: fetchNotifications };
}
