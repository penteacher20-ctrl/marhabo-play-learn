import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/roles";

export function Navbar() {
  const { tr, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRoles();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-2xl grid place-items-center text-white font-black text-lg" style={{ background: "var(--gradient-primary)" }}>م</span>
          <span className="font-display text-xl font-extrabold text-primary">{tr("brand")}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 rounded-full bg-secondary/70 p-1.5">
          <NavItem to="/" label={tr("nav_home")} />
          <NavItem to="/templates" label={tr("nav_templates")} />
          <NavItem to="/upload" label={tr("nav_upload")} />
          {user && <NavItem to="/dashboard" label={tr("nav_dashboard")} />}
          {isAdmin && <NavItem to="/admin" label={lang === "ar" ? "الإدارة" : "Admin"} />}
        </nav>

        <div className="flex items-center gap-2">
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
            <button
              onClick={() => signOut()}
              className="group inline-flex items-center gap-2 rounded-full bg-white/80 hover:bg-white text-foreground border border-border/60 px-4 py-2 text-sm font-bold shadow-sm hover:shadow-md transition-all"
            >
              <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline">{tr("nav_logout")}</span>
            </button>
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
