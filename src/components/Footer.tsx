import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { tr, lang } = useI18n();
  const ar = lang === "ar";
  const links = [
    { to: "/about", label: ar ? "من نحن" : "About us" },
    { to: "/privacy", label: ar ? "سياسة الخصوصية" : "Privacy Policy" },
    { to: "/terms", label: ar ? "شروط الاستخدام" : "Terms of Use" },
    { to: "/contact", label: ar ? "تواصل معنا" : "Contact us" },
  ] as const;

  return (
    <footer className="mt-20 py-10 border-t border-border/60">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <div className="font-display text-lg font-extrabold text-primary mb-1">{tr("brand")}</div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 my-4 font-bold">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-primary transition">
              {l.label}
            </Link>
          ))}
        </nav>
        <div>{tr("footer")}</div>
      </div>
    </footer>
  );
}
