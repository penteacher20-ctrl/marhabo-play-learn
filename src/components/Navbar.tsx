import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/roles";
import { AdminNotifications } from "@/components/AdminNotifications";
import { useSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const { tr, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRoles();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setAvatarUrl((data as any)?.avatar_url ?? null);
    });
  }, [user]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={tr("brand")} className="w-9 h-9 rounded-2xl object-cover" />
          ) : (
            <span className="w-9 h-9 rounded-2xl grid place-items-center text-white font-black text-lg" style={{ background: "var(--gradient-primary)" }}>م</span>
          )}
          <span className="font-display text-xl font-extrabold text-primary">{tr("brand")}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 rounded-full bg-secondary/70 p-1.5">
          <NavItem to="/" label={tr("nav_home")} />
          <NavItem to="/templates" label={tr("nav_templates")} />
          {user && <NavItem to="/dashboard" label={tr("nav_dashboard")} />}
          {user && <NavItem to="/suggestions" label={tr("nav_suggestions")} />}
          {isAdmin && <NavItem to="/admin" label={lang === "ar" ? "الإدارة" : "Admin"} />}
        </nav>

        <div className="flex items-center gap-2">
          {user && <AdminNotifications />}
          <Link
            to="/settings"
            className="w-9 h-9 grid place-items-center rounded-full bg-secondary hover:bg-secondary/70 transition"
            aria-label="Settings"
            title={lang === "ar" ? "الإعدادات" : "Settings"}
          >
            ⚙️
          </Link>
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="px-3 py-1.5 rounded-full text-sm font-bold bg-secondary hover:bg-secondary/70 transition"
          >
            {lang === "ar" ? "EN" : "ع"}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-border/60 hover:border-primary transition" title={tr("nav_dashboard")}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-sm text-white" style={{ background: "var(--gradient-primary)" }}>🦊</div>
                )}
              </Link>
              <button
                onClick={() => signOut()}
                className="group inline-flex items-center gap-2 rounded-full bg-white/80 hover:bg-white text-foreground border border-border/60 px-4 py-2 text-sm font-bold shadow-sm hover:shadow-md transition-all"
              >
                <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="hidden sm:inline">{tr("nav_logout")}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="group relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold text-white shadow-[0_6px_0_-2px_rgba(0,0,0,0.15),0_10px_20px_-6px_rgba(154,115,232,0.5)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              style={{ background: "var(--gradient-primary)" }}
            >
              <LogIn className="w-4 h-4" />
              <span>{tr("nav_login")}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="px-4 py-1.5 rounded-full text-sm font-bold text-foreground/80 hover:text-primary hover:bg-background transition"
      activeProps={{ className: "px-4 py-1.5 rounded-full text-sm font-bold bg-background text-primary shadow-sm" }}
      activeOptions={{ exact: to === "/" }}
    >
      {label}
    </Link>
  );
}
