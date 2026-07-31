import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Share2, Check } from "lucide-react";


export const Route = createFileRoute("/u/$userId")({
  component: PublicProfile,
  head: () => ({
    meta: [
      { title: "ملف عضو — مِرحابو" },
      { name: "description", content: "شاهد الألعاب التعليمية العامة التي أنشأها هذا العضو على منصة مِرحابو." },
      { property: "og:title", content: "ملف عضو في مِرحابو" },
      { property: "og:description", content: "الألعاب التعليمية العامة لهذا العضو." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface G { id: string; title: string; description: string | null; thumbnail_url: string | null; play_count: number; created_at: string; }

const COLORS = ["var(--coral)", "var(--purple-fun)", "var(--cyan-fun)", "var(--green-fun)", "var(--yellow-fun)"];

function PublicProfile() {
  const { tr, lang } = useI18n();
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<{ name: string | null; avatar_url: string | null } | null>(null);
  const [games, setGames] = useState<G[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: p }, { data: gs }] = await Promise.all([
        supabase.from("profiles").select("name,avatar_url").eq("id", userId).maybeSingle(),
        supabase
          .from("games")
          .select("id,title,description,thumbnail_url,play_count,created_at")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);
      if (cancelled) return;
      setProfile((p as any) ?? null);
      setGames(((gs as any[]) ?? []) as G[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const name = profile?.name || (lang === "ar" ? "عضو" : "member");
  const plays = games.reduce((s, g) => s + (g.play_count || 0), 0);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(lang === "ar" ? "تم نسخ رابط البروفايل!" : "Profile link copied!");
    } catch {
      toast.error(lang === "ar" ? "تعذّر نسخ الرابط" : "Could not copy link");
    }
  };

  const stats = [
    { label: lang === "ar" ? "ألعاب عامة" : "Public games", value: games.length, emoji: "🎮", color: "var(--purple-fun)" },
    { label: lang === "ar" ? "إجمالي مرات اللعب" : "Total plays", value: plays, emoji: "👁", color: "var(--cyan-fun)" },
    {
      label: lang === "ar" ? "متوسط اللعب" : "Avg. plays",
      value: games.length ? Math.round(plays / games.length) : 0,
      emoji: "⭐",
      color: "var(--coral)",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="card-pop p-6 md:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="w-20 h-20 rounded-2xl grid place-items-center text-4xl text-white shadow-lg" style={{ background: "var(--gradient-primary)" }}>🦊</div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-display font-black">{name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "ar"
                ? `${games.length} لعبة عامة · ${plays} مرة لعب`
                : `${games.length} public games · ${plays} plays`}
            </p>
          </div>
          <button
            onClick={share}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-lg hover:-translate-y-0.5 transition-transform"
            style={{ background: "var(--gradient-primary)" }}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied
              ? lang === "ar" ? "تم النسخ!" : "Copied!"
              : lang === "ar" ? "مشاركة البروفايل" : "Share profile"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-5">
          {stats.map((s) => (
            <div key={s.label} className="card-pop p-4 sm:p-5 text-center">
              <div className="text-2xl sm:text-3xl">{s.emoji}</div>
              <div className="mt-1 text-2xl sm:text-3xl font-display font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>


        <h2 className="mt-10 mb-5 text-2xl font-display font-extrabold">
          {lang === "ar" ? "الألعاب العامة" : "Public games"}
        </h2>

        {loading ? (
          <div className="card-pop p-12 text-center text-muted-foreground">{lang === "ar" ? "جارٍ التحميل…" : "Loading…"}</div>
        ) : games.length === 0 ? (
          <div className="card-pop p-12 text-center">
            <div className="text-6xl mb-3">🎲</div>
            <p className="text-muted-foreground">{lang === "ar" ? "لا توجد ألعاب عامة لهذا العضو." : "This member has no public games."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {games.map((g, i) => {
              const color = COLORS[i % COLORS.length];
              return (
                <Link key={g.id} to="/play/$gameId" params={{ gameId: g.id }} className="card-pop overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                  <div className="aspect-video grid place-items-center text-5xl relative"
                    style={g.thumbnail_url ? { backgroundImage: `url(${g.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: color }}>
                    {!g.thumbnail_url && <span className="text-white drop-shadow-lg">🎮</span>}
                    <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-xs font-bold backdrop-blur">👁 {g.play_count}</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-display font-extrabold text-base line-clamp-1">{g.title}</h3>
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
