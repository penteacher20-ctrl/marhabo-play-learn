import { supabase } from "@/integrations/supabase/client";
import { generateColoring } from "@/lib/templates";

interface GameRow { id: string; title: string; type: string; file_url: string | null; user_id: string; }

function extractImageUrl(html: string): string | null {
  // Pattern: const SRC = "https://..."
  const m = html.match(/const\s+SRC\s*=\s*("([^"]+)"|'([^']+)')/);
  if (!m) return null;
  return m[2] ?? m[3] ?? null;
}

function pathFromPublicUrl(url: string): string | null {
  // .../storage/v1/object/public/game-files/<path>
  const m = url.match(/\/storage\/v1\/object\/public\/game-files\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface UpgradeResult { upgraded: number; skipped: number; errors: number; total: number; }

export async function upgradeUserColoringGames(userId: string, onProgress?: (msg: string) => void): Promise<UpgradeResult> {
  const result: UpgradeResult = { upgraded: 0, skipped: 0, errors: 0, total: 0 };
  const { data, error } = await supabase
    .from("games")
    .select("id,title,type,file_url,user_id")
    .eq("user_id", userId)
    .eq("type", "template:draw");
  if (error) throw error;
  const games = (data ?? []) as GameRow[];
  result.total = games.length;

  for (const g of games) {
    if (!g.file_url) { result.skipped++; continue; }
    try {
      onProgress?.(`جاري تحديث: ${g.title}`);
      const res = await fetch(g.file_url, { cache: "no-store" });
      const oldHtml = await res.text();
      const imageUrl = extractImageUrl(oldHtml);
      if (!imageUrl) { result.skipped++; continue; }

      const newHtml = generateColoring({ title: g.title, imageUrl });
      const blob = new Blob([newHtml], { type: "text/html" });

      const existingPath = pathFromPublicUrl(g.file_url);
      const newPath = `${g.user_id}/${Date.now()}-draw.html`;

      // Upload new file (avoid cache by using new path)
      const { error: upErr } = await supabase.storage.from("game-files").upload(newPath, blob, { contentType: "text/html" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("game-files").getPublicUrl(newPath);

      const { error: updErr } = await supabase.from("games").update({ file_url: publicUrl }).eq("id", g.id);
      if (updErr) throw updErr;

      // Best-effort cleanup of old file
      if (existingPath && existingPath !== newPath) {
        try { await supabase.storage.from("game-files").remove([existingPath]); } catch { /* ignore */ }
      }

      result.upgraded++;
    } catch (e) {
      console.error("upgrade failed", g.id, e);
      result.errors++;
    }
  }
  return result;
}
