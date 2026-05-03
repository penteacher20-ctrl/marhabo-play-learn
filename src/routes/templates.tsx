import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/templates")({ component: TemplatesPage });

interface Tpl { id: string; slug: string; name_ar: string; name_en: string; description_ar: string | null; description_en: string | null; icon: string | null; is_available: boolean; }
const COLORS = ["var(--coral)", "var(--purple-fun)", "var(--cyan-fun)", "var(--green-fun)", "var(--yellow-fun)", "var(--purple-fun)", "var(--coral)"];

function TemplatesPage() {
  const { tr, lang } = useI18n();
  const [templates, setTemplates] = useState<Tpl[]>([]);
  useEffect(() => { supabase.from("templates").select("*").order("sort_order").then(({ data }) => setTemplates((data as Tpl[]) ?? [])); }, []);

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
            return (
              <div key={t.id} className="card-pop p-6 relative overflow-hidden">
                <div className="absolute -top-12 -end-12 w-36 h-36 rounded-full opacity-20" style={{ background: color }} />
                <div className="text-6xl mb-3">{t.icon}</div>
                <h3 className="text-xl font-display font-extrabold">{lang === "ar" ? t.name_ar : t.name_en}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{lang === "ar" ? t.name_en : t.name_ar}</p>
                <p className="text-sm text-foreground/70 mb-4">{lang === "ar" ? t.description_ar : t.description_en}</p>
                {t.is_available ? (
                  <Link to="/templates/$slug/new" params={{ slug: t.slug }} className="bubble-btn !py-2 !px-5 text-sm text-white" style={{ background: color }}>{tr("use_template")}</Link>
                ) : (
                  <span className="inline-block px-4 py-2 rounded-full bg-muted text-muted-foreground font-bold text-sm">{tr("coming_soon")}</span>
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
