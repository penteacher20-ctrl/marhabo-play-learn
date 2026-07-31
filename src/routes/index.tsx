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
    (async () => {
      const { data: games } = await supabase
        .from("games")
        .select("id,title,description,thumbnail_url,play_count,created_at,user_id")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!games || games.length === 0) { setCommunityGames([]); return; }
      const ids = Array.from(new Set(games.map((g: any) => g.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.name]));
      setCommunityGames(games.map((g: any) => ({ ...g, profiles: { name: map.get(g.user_id) ?? null } })));
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />

      {/* HERO */}
      <section className="relative">
        <FloatingDeco />
        <div className="container mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center relative">
          <div className="order-2 md:order-1 text-center md:text-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-foreground/80 font-bold text-xs sm:text-sm mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--coral)" }} />
              <span>🎉 {tr("more_games")}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black leading-[1.05] tracking-tight text-foreground">
              {lang === "ar" ? <>تعلّم <span style={{ color: "var(--coral)" }}>باللعب</span>!</> : <>Learn by <span style={{ color: "var(--coral)" }}>playing</span>!</>}
            </h1>
            <p className="mt-5 text-base md:text-lg text-foreground/70 font-medium max-w-md mx-auto md:mx-0 leading-relaxed">{tr("hero_sub")}</p>
            <div className="mt-9 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                to="/auth"
                className="group relative inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-extrabold text-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.35) inset, 0 -2px 0 rgba(0,0,0,0.12) inset, 0 10px 24px -8px color-mix(in oklab, var(--coral) 55%, transparent)",
                }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl opacity-70" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)" }} />
                <Sparkles className="relative w-[18px] h-[18px]" />
                <span className="relative tracking-tight">{tr("cta_start")}</span>
                {lang === "ar"
                  ? <ArrowLeft className="relative w-[18px] h-[18px] transition-transform group-hover:-translate-x-1" />
                  : <ArrowRight className="relative w-[18px] h-[18px] transition-transform group-hover:translate-x-1" />}
              </Link>
              <Link
                to="/templates"
                className="inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-extrabold bg-white/80 backdrop-blur-md border border-foreground/10 text-foreground shadow-sm hover:bg-white hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <Gamepad2 className="w-[18px] h-[18px]" style={{ color: "var(--coral)" }} />
                <span className="tracking-tight">{tr("cta_explore")}</span>
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
      {t.icon && /^https?:\/\//i.test(t.icon) ? (
        <img src={t.icon} alt="" className="w-14 h-14 object-cover rounded-2xl mb-3" />
      ) : (
        <div className="text-5xl mb-3">{t.icon}</div>
      )}
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

function CommunityCard({ g, idx }: { g: CommunityGame; idx: number }) {
  const { tr, lang } = useI18n();
  const color = COLORS[idx % COLORS.length];
  const authorName = g.profiles?.name || (lang === "ar" ? "عضو" : "member");
  return (
    <div className="card-pop overflow-hidden flex flex-col group hover:-translate-y-1 transition-transform">
      <Link to="/play/$gameId" params={{ gameId: g.id }} className="block">
        <div
          className="aspect-video grid place-items-center text-5xl relative overflow-hidden"
          style={g.thumbnail_url ? { backgroundImage: `url(${g.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: color }}
        >
          {!g.thumbnail_url && <span className="text-white drop-shadow-lg">🎮</span>}
          <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-xs font-bold backdrop-blur">👁 {g.play_count}</span>
        </div>
      </Link>
      <div className="p-4 flex-1 flex flex-col">
        <Link to="/play/$gameId" params={{ gameId: g.id }}>
          <h3 className="font-display font-extrabold text-base line-clamp-1">{g.title}</h3>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">
          {tr("by")}{" "}
          <Link to="/u/$userId" params={{ userId: g.user_id }} className="font-bold hover:underline" style={{ color }}>{authorName}</Link>
        </p>
        {g.description && <p className="text-xs text-foreground/70 mt-2 line-clamp-2">{g.description}</p>}
        <Link to="/play/$gameId" params={{ gameId: g.id }} className="mt-3 inline-block text-center px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: color }}>▶ {tr("play_now")}</Link>
      </div>
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
