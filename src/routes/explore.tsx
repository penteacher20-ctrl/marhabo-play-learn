import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explore")({
  component: Explore,
  head: () => ({
    meta: [
      { title: "استكشف الألعاب — مِرحابو" },
      { name: "description", content: "ألعاب تعليمية أنشأها المعلمون والأطفال على منصة مِرحابو." },
      { property: "og:title", content: "استكشف ألعاب مِرحابو" },
      { property: "og:description", content: "ألعاب تعليمية من صنع مجتمع مِرحابو." },
    ],
  }),
});

interface G { id: string; title: string; description: string | null; thumbnail_url: string | null; play_count: number; user_id: string; created_at: string; profiles?: { name: string | null } | null; }

const COLORS = ["var(--coral)", "var(--purple-fun)", "var(--cyan-fun)", "var(--green-fun)", "var(--yellow-fun)"];

function Explore() {
  const { tr, lang } = useI18n();
  const [games, setGames] = useState<G[]>([]);
  const [sort, setSort] = useState<"new" | "popular">("new");

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("games")
        .select("id,title,description,thumbnail_url,play_count,created_at,user_id")
        .eq("is_public", true)
        .limit(60);
      q = sort === "new" ? q.order("created_at", { ascending: false }) : q.order("play_count", { ascending: false });
      const { data } = await q;
      const rows = (data as any[]) ?? [];
      if (rows.length === 0) { setGames([]); return; }
      const ids = Array.from(new Set(rows.map((g) => g.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.name]));
      setGames(rows.map((g) => ({ ...g, profiles: { name: map.get(g.user_id) ?? null } })));
    })();
  }, [sort]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-display font-black">{tr("community_title")}</h1>
          <p className="mt-3 text-muted-foreground text-lg">{tr("community_sub")}</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setSort("new")}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${sort === "new" ? "text-white shadow-lg" : "bg-secondary text-foreground"}`}
            style={sort === "new" ? { background: "var(--gradient-primary)" } : {}}
          >
            {lang === "ar" ? "🆕 الأحدث" : "🆕 Newest"}
          </button>
          <button
            onClick={() => setSort("popular")}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${sort === "popular" ? "text-white shadow-lg" : "bg-secondary text-foreground"}`}
            style={sort === "popular" ? { background: "var(--gradient-primary)" } : {}}
          >
            {lang === "ar" ? "🔥 الأكثر لعباً" : "🔥 Popular"}
          </button>
        </div>

        {games.length === 0 ? (
          <div className="card-pop p-12 text-center">
            <div className="text-6xl mb-3">🎲</div>
            <p className="text-muted-foreground">{lang === "ar" ? "لا توجد ألعاب بعد." : "No games yet."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {games.map((g, i) => {
              const color = COLORS[i % COLORS.length];
              const authorName = g.profiles?.name || (lang === "ar" ? "عضو" : "member");
              return (
                <Link key={g.id} to="/play/$gameId" params={{ gameId: g.id }} className="card-pop overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                  <div className="aspect-video grid place-items-center text-5xl relative"
                    style={g.thumbnail_url ? { backgroundImage: `url(${g.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: color }}>
                    {!g.thumbnail_url && <span className="text-white drop-shadow-lg">🎮</span>}
                    <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-xs font-bold backdrop-blur">👁 {g.play_count}</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-display font-extrabold text-base line-clamp-1">{g.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tr("by")} {authorName}</p>
                    {g.description && <p className="text-xs text-foreground/70 mt-2 line-clamp-2">{g.description}</p>}
                    <span className="mt-3 inline-block text-center px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: color }}>▶ {tr("play_now")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
