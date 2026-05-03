import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/upload")({ component: UploadPage });

function UploadPage() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  if (!user) {
    return (
      <Wrapper>
        <div className="card-pop p-10 text-center max-w-md mx-auto">
          <div className="text-5xl mb-3">🔐</div>
          <h2 className="text-2xl font-display font-extrabold mb-2">{tr("nav_login")}</h2>
          <p className="text-muted-foreground mb-6">سجّل دخولك لرفع الألعاب</p>
          <button onClick={() => navigate({ to: "/auth" })} className="bubble-btn text-white" style={{ background: "var(--gradient-primary)" }}>{tr("signin")}</button>
        </div>
      </Wrapper>
    );
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".html")) setFile(f);
    else toast.error("ارفع ملف HTML فقط");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title) { toast.error("املأ كل الحقول"); return; }
    setBusy(true);
    try {
      const ts = Date.now();
      const filePath = `${user.id}/${ts}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("game-files").upload(filePath, file, { contentType: "text/html" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("game-files").getPublicUrl(filePath);

      let thumbUrl: string | null = null;
      if (thumb) {
        const tp = `${user.id}/${ts}-${thumb.name}`;
        const { error: tErr } = await supabase.storage.from("thumbnails").upload(tp, thumb);
        if (!tErr) thumbUrl = supabase.storage.from("thumbnails").getPublicUrl(tp).data.publicUrl;
      }

      const { data: game, error: gErr } = await supabase.from("games").insert({
        user_id: user.id, title, description: desc, type: "html", file_url: publicUrl, thumbnail_url: thumbUrl, is_public: isPublic,
      }).select().single();
      if (gErr) throw gErr;

      toast.success("تم رفع اللعبة بنجاح! 🎉");
      navigate({ to: "/play/$gameId", params: { gameId: game.id } });
    } catch (err: any) {
      toast.error(err.message ?? "خطأ أثناء الرفع");
    } finally { setBusy(false); }
  };

  return (
    <Wrapper>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display font-black text-center mb-2">{tr("upload_title")}</h1>
        <p className="text-center text-muted-foreground mb-8">{tr("upload_sub")}</p>

        <form onSubmit={submit} className="card-pop p-8 space-y-5">
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`block border-3 border-dashed rounded-3xl p-10 text-center cursor-pointer transition ${drag ? "border-primary bg-primary/5" : "border-border bg-secondary/40"}`}
            style={{ borderWidth: 3 }}
          >
            <input type="file" accept=".html" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div className="text-5xl mb-2">📂</div>
            <div className="font-bold">{file ? file.name : tr("upload_sub")}</div>
            <div className="text-xs text-muted-foreground mt-1">.html</div>
          </label>

          <Field label={tr("game_title")}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
          </Field>
          <Field label={tr("game_desc")}>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input" />
          </Field>
          <Field label={tr("thumbnail")}>
            <input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} className="text-sm" />
          </Field>

          <div className="flex items-center justify-between bg-secondary/50 rounded-2xl px-4 py-3">
            <span className="font-bold">{tr("privacy")}</span>
            <div className="flex gap-1 p-1 bg-background rounded-full">
              <button type="button" onClick={() => setIsPublic(true)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${isPublic ? "text-white" : "text-foreground"}`} style={isPublic ? { background: "var(--green-fun)" } : {}}>{tr("public")}</button>
              <button type="button" onClick={() => setIsPublic(false)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${!isPublic ? "text-white bg-foreground" : "text-foreground"}`}>{tr("private")}</button>
            </div>
          </div>

          <button disabled={busy} className="bubble-btn text-white w-full disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
            {busy ? "..." : `🚀 ${tr("upload_now")}`}
          </button>
        </form>
      </div>
      <style>{`.input{width:100%;padding:.75rem 1rem;border-radius:1rem;background:hsl(0 0% 100%);border:2px solid var(--color-border);font:inherit;outline:none;transition:border-color .2s}.input:focus{border-color:var(--color-primary)}`}</style>
    </Wrapper>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-bold mb-1.5">{label}</span>{children}</label>;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
