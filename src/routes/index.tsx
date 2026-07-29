import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Gamepad2, ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingDeco } from "@/components/FloatingDeco";
import { supabase } from "@/integrations/supabase/client";
import mascot from "@/assets/mascot-fox.png";

export const Route = createFileRoute("/")({ component: Index });

interface Tpl { id: string; slug: string; name_ar: string; name_en: string; description_ar: string | null; description_en: string | null; icon: string | null; is_available: boolean; }
interface CommunityGame { id: string; title: string; description: string | null; thumbnail_url: string | null; play_count: number; created_at: string; user_id: string; profiles?: { name: string | null } | null; }

function Index() {
  const { tr, lang } = useI18n();
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>([]);

  useEffect(() => {
    supabase.from("templates").select("*").order("sort_order").then(({ data }) => setTemplates((data as Tpl[]) ?? []));
    supabase
      .from("games")
      .select("id,title,description,thumbnail_url,play_count,created_at,user_id, profiles(name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setCommunityGames((data as any) ?? []));
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />

      {/* HERO */}
      <section className="relative">
        <FloatingDeco />
        <div className="container mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center relative">
          <div className="order-2 md:order-1 text-center md:text-start">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-fun/30 text-foreground font-bold text-sm mb-6">
              🎉 {tr("more_games")}
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black leading-tight">
              {lang === "ar" ? <>تعلّم <span style={{ color: "var(--coral)" }}>باللعب</span>!</> : <>Learn by <span style={{ color: "var(--coral)" }}>playing</span>!</>}
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground font-medium max-w-md mx-auto md:mx-0">{tr("hero_sub")}</p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <Link
                to="/auth"
                className="group relative inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-base font-extrabold text-white shadow-[0_8px_0_-2px_rgba(0,0,0,0.18),0_18px_32px_-10px_rgba(143,232,112,0.55)] hover:-translate-y-1 active:translate-y-0.5 transition-all overflow-hidden"
                style={{ background: "var(--gradient-fresh)" }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, #2FEAFF, #8EE870)" }} />
                <Sparkles className="relative w-5 h-5 drop-shadow-sm" />
                <span className="relative">{tr("cta_start")}</span>
                {lang === "ar" ? <ArrowLeft className="relative w-5 h-5 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </Link>
              <Link
                to="/templates"
                className="inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-base font-extrabold text-foreground shadow-[0_6px_0_-2px_rgba(0,0,0,0.15),0_14px_24px_-10px_rgba(255,204,53,0.6)] hover:-translate-y-1 active:translate-y-0.5 transition-all"
                style={{ background: "var(--yellow-fun)" }}
              >
                <Gamepad2 className="w-5 h-5" />
                <span>{tr("cta_explore")}</span>
              </Link>
            </div>
          </div>

          <div className="order-1 md:order-2 relative flex justify-center">
            <div className="absolute inset-0 rounded-full blur-3xl opacity-50" style={{ background: "var(--gradient-primary)" }} />
            <div className="relative w-72 md:w-[420px] float-anim">
              <img src={mascot} alt="Marhabo Fox Mascot" className="w-full drop-shadow-2xl mascot-flip" style={{ transform: lang === "ar" ? "scaleX(-1)" : "scaleX(1)" }} />
            </div>
            <span className="absolute top-8 -left-4 md:left-0 px-4 py-2 rounded-2xl bg-cyan-fun text-foreground font-extrabold text-lg shadow-lg wiggle">مرحبا!</span>
            <span className="absolute bottom-16 -right-2 px-3 py-2 rounded-full bg-green-fun text-foreground font-extrabold shadow-lg float-anim-slow">+55 ⭐</span>
          </div>
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-display font-black">{tr("templates_title")}</h2>
          <p className="mt-3 text-muted-foreground text-lg">{tr("templates_sub")}</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {templates.slice(0, 6).map((t, i) => <TemplateCard key={t.id} t={t} idx={i} />)}
        </div>
        <div className="text-center mt-8">
          <Link to="/templates" className="bubble-btn text-white" style={{ background: "var(--gradient-primary)" }}>{tr("nav_templates")} →</Link>
        </div>
      </section>

      {/* COMMUNITY GAMES */}
      {communityGames.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-display font-black">{tr("community_title")}</h2>
            <p className="mt-3 text-muted-foreground text-lg">{tr("community_sub")}</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {communityGames.map((g, i) => <CommunityCard key={g.id} g={g} idx={i} />)}
          </div>
          <div className="text-center mt-8">
            <Link to="/explore" className="bubble-btn text-white" style={{ background: "var(--gradient-fresh)" }}>{tr("view_all")} →</Link>
          </div>
        </section>
      )}


      {/* HOW */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl md:text-5xl font-display font-black text-center mb-12">{tr("how_title")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Step n={1} color="var(--coral)" title={tr("step1_t")} desc={tr("step1_d")} icon="🎯" />
          <Step n={2} color="var(--purple-fun)" title={tr("step2_t")} desc={tr("step2_d")} icon="✏️" />
          <Step n={3} color="var(--green-fun)" title={tr("step3_t")} desc={tr("step3_d")} icon="🚀" />
        </div>
      </section>

      <Footer />
    </div>
  );
}

const COLORS = ["var(--coral)", "var(--purple-fun)", "var(--cyan-fun)", "var(--green-fun)", "var(--yellow-fun)", "var(--purple-fun)"];

function TemplateCard({ t, idx }: { t: Tpl; idx: number }) {
  const { tr, lang } = useI18n();
  const color = COLORS[idx % COLORS.length];
  return (
    <div className="card-pop p-6 relative overflow-hidden">
      <div className="absolute -top-10 -end-10 w-32 h-32 rounded-full opacity-20" style={{ background: color }} />
      <div className="text-5xl mb-3">{t.icon}</div>
      <h3 className="text-xl font-display font-extrabold">{lang === "ar" ? t.name_ar : t.name_en}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{lang === "ar" ? t.description_ar : t.description_en}</p>
      {t.is_available ? (
        <Link to="/templates/$slug/new" params={{ slug: t.slug }} className="bubble-btn !py-2 !px-5 text-sm text-white" style={{ background: color }}>{tr("use_template")}</Link>
      ) : (
        <span className="inline-block px-4 py-2 rounded-full bg-muted text-muted-foreground font-bold text-sm">{tr("coming_soon")}</span>
      )}
    </div>
  );
}

function Step({ n, color, title, desc, icon }: { n: number; color: string; title: string; desc: string; icon: string }) {
  return (
    <div className="card-pop p-8 text-center relative">
      <div className="w-16 h-16 mx-auto rounded-2xl grid place-items-center text-3xl text-white font-black shadow-lg" style={{ background: color }}>{icon}</div>
      <div className="absolute top-4 end-4 w-9 h-9 rounded-full bg-secondary grid place-items-center font-display font-black text-primary">{n}</div>
      <h3 className="mt-5 text-2xl font-display font-extrabold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{desc}</p>
    </div>
  );
}
