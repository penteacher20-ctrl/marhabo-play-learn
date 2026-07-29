import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  getUnreadNotificationsCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications.functions";

interface Notif {
  id: string; type: string; title: string; message: string;
  reference_id: string | null; reference_type: string | null;
  is_read: boolean; created_at: string;
}

function timeAgo(iso: string, ar: boolean) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return ar ? "الآن" : "now";
  const m = Math.floor(s / 60);
  if (m < 60) return ar ? `منذ ${m} د` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? `منذ ${h} س` : `${h}h`;
  const d = Math.floor(h / 24);
  return ar ? `منذ ${d} ي` : `${d}d`;
}

export function AdminNotifications() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadCount = async () => {
    try { setCount((await getUnreadNotificationsCount()).count); } catch {}
  };
  const loadList = async () => {
    try { setItems((await getNotifications({ data: { limit: 10 } })) as Notif[]); } catch {}
  };

  useEffect(() => {
    if (!user) return;
    loadCount();
    // Realtime
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { loadCount(); if (open) loadList(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [user?.id]);

  useEffect(() => {
    if (open) loadList();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onItem = async (n: Notif) => {
    if (!n.is_read) {
      try { await markNotificationAsRead({ data: { id: n.id } }); } catch {}
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
      setCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.reference_type === "suggestion") {
      if (n.type === "suggestion_update") {
        navigate({ to: "/suggestions" });
      } else {
        navigate({ to: "/admin" });
      }
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setCount(0);
    } catch {}
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 grid place-items-center rounded-full bg-secondary hover:bg-secondary/70 transition"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-black grid place-items-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute mt-2 w-80 max-w-[90vw] rounded-2xl bg-background border border-border shadow-2xl overflow-hidden z-50 ${ar ? "start-0" : "end-0"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="font-display font-extrabold">{ar ? "الإشعارات" : "Notifications"}</div>
            {count > 0 && (
              <button onClick={markAll} className="text-xs font-bold text-primary hover:underline">
                {ar ? "تعليم الكل كمقروء" : "Mark all read"}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{ar ? "لا توجد إشعارات" : "No notifications"}</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onItem(n)}
                  className={`w-full text-start px-4 py-3 border-b border-border/60 hover:bg-secondary/40 transition ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className={`text-sm ${!n.is_read ? "font-black" : "font-bold"}`}>{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at, ar)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
