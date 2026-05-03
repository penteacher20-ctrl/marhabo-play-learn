import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

interface Game { id: string; title: string; description: string | null; thumbnail_url: string | null; play_count: number; is_public: boolean; created_at: string; }

function Dashboard() {
  const { tr } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);

  const load = () => {
    if (!user) return;
    supabase.from("games").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setGames((data as Game[]) ?? []));
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const remove = async (id: string) => {
    if (!confirm("حذف اللعبة؟")) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    setGames(games.filter(g => g.id !== id));
  };

  const totalPlays = games.reduce((s, g) => s + g.play_count, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-10 flex-1">
        <h1 className="text-4xl md:text-5xl font-display font-black mb-8">{tr("my_games")}</h1>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Stat label={tr("total_games")} value={games.length} color="var(--purple-fun)" icon="🎮" />
          <Stat label={tr("total_plays")} value={totalPlays} color="var(--green-fun)" icon="🎯" />
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Link to="/upload" className="bubble-btn text-white" style={{ background: "var(--gradient-primary)" }}>+ {tr("upload_new")}</Link>
          <Link to="/templates" className="bubble-btn text-foreground" style={{ background: "var(--yellow-fun)" }}>✨ {tr("from_template")}</Link>
        </div>

        {games.length === 0 ? (
          <div className="card-pop p-12 text-center">
            <div className="text-6xl mb-3">🎲</div>
            <p className="text-muted-foreground">لا توجد ألعاب بعد. ابدأ برفع لعبتك الأولى!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((g) => (
              <div key={g.id} className="card-pop overflow-hidden flex flex-col">
                <Link to="/play/$gameId" params={{ gameId: g.id }} className="block">
                  <div className="aspect-video bg-secondary grid place-items-center text-5xl"
                    style={g.thumbnail_url ? { backgroundImage: `url(${g.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                    {!g.thumbnail_url && "🎮"}
                  </div>
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-display font-extrabold text-lg">{g.title}</h3>
                  <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                    <span>👁 {g.play_count}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.is_public ? "bg-green-fun/30" : "bg-secondary"}`}>{g.is_public ? tr("public") : tr("private")}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to="/play/$gameId" params={{ gameId: g.id }} className="flex-1 text-center px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20">▶ تشغيل</Link>
                    <Link to="/games/$gameId/edit" params={{ gameId: g.id }} className="flex-1 text-center px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-fun/30 text-foreground hover:bg-yellow-fun/50">✏️ تعديل</Link>
                    <button onClick={() => remove(g.id)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive/20">🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="card-pop p-6 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl grid place-items-center text-2xl text-white" style={{ background: color }}>{icon}</div>
      <div>
        <div className="text-3xl font-display font-black">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
