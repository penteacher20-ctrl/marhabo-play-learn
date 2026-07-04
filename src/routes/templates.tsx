import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/templates")({ component: TemplatesPage });

interface Tpl {
  id: string; slug: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
  icon: string | null; is_available: boolean; external_url: string | null;
}
const COLORS = ["var(--coral)", "var(--purple-fun)", "var(--cyan-fun)", "var(--green-fun)", "var(--yellow-fun)", "var(--purple-fun)", "var(--coral)"];

function TemplatesPage() {
  const { tr, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const ar = lang === "ar";

  useEffect(() => { supabase.from("templates").select("*").order("sort_order").then(({ data }) => setTemplates((data as Tpl[]) ?? [])); }, []);

  if (location.pathname !== "/templates") return <Outlet />;

  const useExternal = async (t: Tpl) => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!t.external_url) return;
    const title = window.prompt(ar ? "عنوان اللعبة:" : "Game title:", ar ? t.name_ar : t.name_en);
    if (!title || !title.trim()) return;
    setBusy(t.id);
    try {
      let finalUrl = t.external_url;
      try {
        const u = new URL(t.external_url);
        u.hash = `lv=size=responsive&ar=16%2F10`;
        finalUrl = u.toString();
      } catch { /* keep raw */ }
      const { data: game, error } = await supabase.from("games").insert({
        user_id: user.id, title: title.trim(),
        description: ar ? t.description_ar : t.description_en,
        type: "embed", file_url: finalUrl, is_public: true,
      }).select().single();
      if (error) throw error;
      toast.success(ar ? "تم إنشاء اللعبة" : "Game created");
      navigate({ to: "/play/$gameId", params: { gameId: game.id } });
    } catch (e: any) {
      toast.error(e.message ?? "خطأ");
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-display font-black">{tr("templates_title")}</h1>
          <p className="mt-3 text-muted-foreground text-lg">{tr("templates_sub")}</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {templates.map((t, i) => {
            const color = COLORS[i % COLORS.length];
            const isExternal = !!t.external_url;
            return (
              <div key={t.id} className="card-pop p-6 relative overflow-hidden">
                <div className="absolute -top-12 -end-12 w-36 h-36 rounded-full opacity-20" style={{ background: color }} />
                <div className="text-6xl mb-3">{t.icon}</div>
                {isExternal && (
                  <span className="absolute top-3 start-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    🔗 {ar ? "خارجي" : "External"}
                  </span>
                )}
                <h3 className="text-xl font-display font-extrabold">{ar ? t.name_ar : t.name_en}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{ar ? t.name_en : t.name_ar}</p>
                <p className="text-sm text-foreground/70 mb-4">{ar ? t.description_ar : t.description_en}</p>
                {!t.is_available ? (
                  <span className="inline-block px-4 py-2 rounded-full bg-muted text-muted-foreground font-bold text-sm">{tr("coming_soon")}</span>
                ) : isExternal ? (
                  <button
                    onClick={() => useExternal(t)}
                    disabled={busy === t.id}
                    className="bubble-btn !py-2 !px-5 text-sm text-white disabled:opacity-60"
                    style={{ background: color }}
                  >
                    {busy === t.id ? "..." : tr("use_template")}
                  </button>
                ) : (
                  <Link to="/templates/$slug/new" params={{ slug: t.slug }} className="bubble-btn !py-2 !px-5 text-sm text-white" style={{ background: color }}>{tr("use_template")}</Link>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
