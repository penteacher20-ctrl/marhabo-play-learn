import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { tr, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
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
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="px-3 py-1.5 rounded-full text-sm font-bold bg-secondary hover:bg-secondary/70 transition"
          >
            {lang === "ar" ? "EN" : "ع"}
          </button>
          {user ? (
            <button onClick={() => signOut()} className="bubble-btn !px-5 !py-2 text-sm bg-secondary text-secondary-foreground">
              {tr("nav_logout")}
            </button>
          ) : (
            <button onClick={() => navigate({ to: "/auth" })} className="bubble-btn !px-5 !py-2 text-sm text-white" style={{ background: "var(--gradient-fresh)" }}>
              {tr("nav_login")}
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
