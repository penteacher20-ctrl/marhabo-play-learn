import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { createSuggestion, getUserSuggestions, signSuggestionImage } from "@/lib/suggestions.functions";

export const Route = createFileRoute("/suggestions")({
  head: () => ({
    meta: [
      { title: "اقتراحاتي — مِرحابو" },
      { name: "description", content: "شاركنا أفكارك وملاحظاتك لتطوير مِرحابو." },
      { property: "og:title", content: "الاقتراحات — مِرحابو" },
      { property: "og:description", content: "شاركنا أفكارك وملاحظاتك لتطوير مِرحابو." },
    ],
  }),
  component: SuggestionsPage,
});

interface MySugg {
  id: string; title: string; description: string;
  image_url: string | null; link_url: string | null;
  status: "new" | "reviewed" | "resolved" | "rejected";
  admin_response: string | null; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

function statusLabel(s: string, ar: boolean) {
  const map: any = { new: ["جديد","New"], reviewed:["قيد المراجعة","Reviewed"], resolved:["تم","Resolved"], rejected:["مرفوض","Rejected"] };
  return (map[s] ?? [s,s])[ar?0:1];
}

function SuggestionsPage() {
  const { lang, tr } = useI18n();
  const ar = lang === "ar";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<MySugg[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const load = async () => {
    try { setMine((await getUserSuggestions()) as MySugg[]); }
    catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { if (user) load(); }, [user]);

  const pickFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !desc.trim()) { toast.error(ar?"العنوان والوصف مطلوبان":"Title and description required"); return; }
    setBusy(true);
    try {
      let image_path: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error(ar?"الحد 5 ميجا":"Max 5MB");
        const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("suggestion-images").upload(path, file, {
          contentType: file.type || undefined, upsert: false,
        });
        if (error) throw error;
        image_path = path;
      }
      await createSuggestion({ data: { title, description: desc, link_url: link || null, image_path } });
      toast.success(tr("sugg_sent"));
      setTitle(""); setDesc(""); setLink(""); pickFile(null);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
        <Navbar />
        <main className="container mx-auto px-4 py-12 flex-1 text-center text-muted-foreground">...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-10 flex-1 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-black text-primary">{tr("sugg_title")}</h1>
          <p className="text-muted-foreground mt-2">{tr("sugg_sub")}</p>
        </div>

        <form onSubmit={submit} className="card-pop p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold block mb-1">{tr("sugg_form_title")} *</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="input" />
          </label>
          <label className="block">
            <span className="text-sm font-bold block mb-1">{tr("sugg_form_desc")} *</span>
            <textarea required value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} maxLength={5000} className="input" />
          </label>
          <label className="block">
            <span className="text-sm font-bold block mb-1">{tr("sugg_form_link")}</span>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="input" />
          </label>
          <div>
            <span className="text-sm font-bold block mb-1">{tr("sugg_form_image")}</span>
            <div className="flex items-center gap-3">
              <label className="bubble-btn bg-secondary hover:bg-secondary/70 cursor-pointer text-sm">
                📷 {ar?"اختر صورة":"Choose image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              </label>
              {preview && (
                <div className="relative">
                  <img src={preview} alt="" className="h-20 w-20 rounded-2xl object-cover border-2 border-border" />
                  <button type="button" onClick={() => pickFile(null)} className="absolute -top-2 -end-2 bg-destructive text-white w-6 h-6 rounded-full text-xs font-bold">✕</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button disabled={busy} className="bubble-btn text-white disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
              {busy ? "..." : tr("sugg_send")}
            </button>
          </div>
        </form>

        <section className="mt-10">
          <h2 className="text-2xl font-display font-black mb-4">{tr("sugg_my")}</h2>
          {mine.length === 0 ? (
            <div className="card-pop p-6 text-center text-muted-foreground">{tr("sugg_empty")}</div>
          ) : (
            <div className="grid gap-3">
              {mine.map((s) => <MySuggCard key={s.id} s={s} ar={ar} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
      <style>{`.input{width:100%;padding:.65rem .9rem;border-radius:.9rem;background:#fff;border:2px solid var(--color-border);font:inherit;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function MySuggCard({ s, ar }: { s: MySugg; ar: boolean }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    if (s.image_url) signSuggestionImage({ data: { path: s.image_url } }).then((r) => setImgUrl(r.url)).catch(() => {});
  }, [s.image_url]);
  return (
    <div className="card-pop p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <h3 className="font-bold text-lg">{s.title}</h3>
          <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString(ar?"ar-EG":"en")}</p>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status]}`}>{statusLabel(s.status, ar)}</span>
      </div>
      <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{s.description}</p>
      {imgUrl && <img src={imgUrl} alt="" className="mt-3 rounded-xl max-h-48 object-contain" />}
      {s.link_url && <a href={s.link_url} target="_blank" rel="noreferrer" className="block text-xs text-primary underline mt-2 break-all">🔗 {s.link_url}</a>}
      {s.admin_response && (
        <div className="mt-3 p-3 rounded-2xl bg-primary/5 border-2 border-primary/20">
          <div className="text-xs font-bold text-primary mb-1">{ar?"رد الإدارة":"Admin response"}</div>
          <p className="text-sm whitespace-pre-wrap">{s.admin_response}</p>
        </div>
      )}
    </div>
  );
}
