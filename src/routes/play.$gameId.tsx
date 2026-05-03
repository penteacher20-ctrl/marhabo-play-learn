import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/play/$gameId")({ component: PlayPage });

interface Game { id: string; title: string; description: string | null; file_url: string | null; user_id: string; play_count: number; }

function PlayPage() {
  const { gameId } = Route.useParams();
  const { tr } = useI18n();
  const [game, setGame] = useState<Game | null>(null);
  const [creator, setCreator] = useState<string>("");
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
      if (data) {
        setGame(data as Game);
        await supabase.from("games").update({ play_count: (data as Game).play_count + 1 }).eq("id", gameId);
        const { data: p } = await supabase.from("profiles").select("name").eq("id", (data as Game).user_id).maybeSingle();
        if (p) setCreator((p as any).name ?? "");
      }
    })();
  }, [gameId]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/play/${gameId}` : "";
  const embed = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success(tr("copied")); };

  if (!game) return <div className="min-h-screen grid place-items-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold">{game.title}</h1>
            {creator && <p className="text-sm text-muted-foreground">بواسطة {creator}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => copy(shareUrl)} className="bubble-btn !py-2 !px-5 text-sm text-white" style={{ background: "var(--gradient-fresh)" }}>🔗 {tr("share_link")}</button>
            <button onClick={() => setShowEmbed(!showEmbed)} className="bubble-btn !py-2 !px-5 text-sm text-foreground" style={{ background: "var(--yellow-fun)" }}>📋 {tr("embed_code")}</button>
          </div>
        </div>
        {showEmbed && (
          <div className="card-pop p-4 mb-4">
            <pre onClick={() => copy(embed)} className="cursor-pointer text-xs bg-secondary/60 rounded-xl p-3 overflow-x-auto">{embed}</pre>
          </div>
        )}
        <div className="card-pop flex-1 overflow-hidden p-2">
          {game.file_url ? (
            <iframe src={game.file_url} title={game.title} className="w-full h-full min-h-[70vh] rounded-2xl border-0" allowFullScreen />
          ) : <div className="grid place-items-center h-96 text-muted-foreground">لا يوجد ملف</div>}
        </div>
      </div>
    </div>
  );
}
