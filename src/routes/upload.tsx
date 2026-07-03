import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/upload")({ component: UploadPage });

const MIME: Record<string, string> = {
  html: "text/html", htm: "text/html",
  css: "text/css", js: "application/javascript", mjs: "application/javascript",
  json: "application/json", svg: "image/svg+xml", png: "image/png",
  jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  ico: "image/x-icon", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
  mp4: "video/mp4", webm: "video/webm", woff: "font/woff", woff2: "font/woff2",
  ttf: "font/ttf", otf: "font/otf", txt: "text/plain",
};

function UploadPage() {
  const { tr } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [drag, setDrag] = useState(false);

  if (loading) return <Wrapper><div className="card-pop p-10 text-center max-w-md mx-auto">جاري التحميل...</div></Wrapper>;

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

  const accept = (f: File | null) => {
    if (!f) return;
    const n = f.name.toLowerCase();
    if (n.endsWith(".html") || n.endsWith(".htm") || n.endsWith(".zip")) setFile(f);
    else toast.error("ارفع ملف HTML أو ZIP فقط");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    accept(e.dataTransfer.files[0]);
  };

  const safe = (n: string) => n.replace(/[^a-zA-Z0-9._/-]/g, "_");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title) { toast.error("املأ كل الحقول"); return; }
    setBusy(true);
    try {
      const ts = Date.now();
      const isZip = file.name.toLowerCase().endsWith(".zip");
      let publicUrl = "";
      let gameType: "html" | "html-zip" = "html";

      if (isZip) {
        setProgress("جاري فك ضغط الملف...");
        const zip = await JSZip.loadAsync(file);
        const entries = Object.values(zip.files).filter((f) => !f.dir);
        if (!entries.length) throw new Error("الملف المضغوط فارغ");

        // Find index.html: prefer root, else shallowest
        const htmls = entries.filter((f) => /\.html?$/i.test(f.name));
        if (!htmls.length) throw new Error("لم يتم العثور على ملف HTML داخل الملف المضغوط");
        htmls.sort((a, b) => a.name.split("/").length - b.name.split("/").length);
        const indexEntry =
          htmls.find((f) => /^(?:[^/]+\/)?index\.html?$/i.test(f.name)) ?? htmls[0];

        // Strip common root folder (foo/index.html → index.html)
        const parts = indexEntry.name.split("/");
        const stripPrefix = parts.length > 1 ? parts.slice(0, -1).join("/") + "/" : "";
        const baseFolder = `${user.id}/${ts}-${safe(file.name.replace(/\.zip$/i, ""))}`;

        let done = 0;
        for (const entry of entries) {
          let rel = entry.name;
          if (stripPrefix && rel.startsWith(stripPrefix)) rel = rel.slice(stripPrefix.length);
          if (!rel) continue;
          rel = safe(rel);
          const ext = rel.split(".").pop()?.toLowerCase() ?? "";
          const contentType = MIME[ext] ?? "application/octet-stream";
          const blob = await entry.async("blob");
          const path = `${baseFolder}/${rel}`;
          const { error } = await supabase.storage
            .from("game-files")
            .upload(path, blob, { contentType, upsert: true });
          if (error) throw new Error(`فشل رفع ${rel}: ${error.message}`);
          done++;
          setProgress(`رفع الملفات ${done}/${entries.length}`);
        }

        let indexRel = indexEntry.name;
        if (stripPrefix && indexRel.startsWith(stripPrefix)) indexRel = indexRel.slice(stripPrefix.length);
        indexRel = safe(indexRel);
        publicUrl = supabase.storage.from("game-files").getPublicUrl(`${baseFolder}/${indexRel}`).data.publicUrl;
        gameType = "html-zip";
      } else {
        setProgress("جاري رفع الملف...");
        const filePath = `${user.id}/${ts}-${safe(file.name)}`;
        const { error: upErr } = await supabase.storage.from("game-files").upload(filePath, file, { contentType: "text/html" });
        if (upErr) throw upErr;
        publicUrl = supabase.storage.from("game-files").getPublicUrl(filePath).data.publicUrl;
      }

      let thumbUrl: string | null = null;
      if (thumb) {
        setProgress("رفع الصورة المصغرة...");
        const tp = `${user.id}/${ts}-${safe(thumb.name)}`;
        const { error: tErr } = await supabase.storage.from("thumbnails").upload(tp, thumb);
        if (!tErr) thumbUrl = supabase.storage.from("thumbnails").getPublicUrl(tp).data.publicUrl;
      }

      setProgress("حفظ اللعبة...");
      const { data: game, error: gErr } = await supabase.from("games").insert({
        user_id: user.id, title, description: desc, type: gameType, file_url: publicUrl, thumbnail_url: thumbUrl, is_public: isPublic,
      }).select().single();
      if (gErr) throw gErr;

      toast.success("تم رفع اللعبة بنجاح! 🎉");
      navigate({ to: "/play/$gameId", params: { gameId: game.id } });
    } catch (err: any) {
      toast.error(err.message ?? "خطأ أثناء الرفع");
    } finally { setBusy(false); setProgress(""); }
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
            <input type="file" accept=".html,.htm,.zip" hidden onChange={(e) => accept(e.target.files?.[0] ?? null)} />
            <div className="text-5xl mb-2">📂</div>
            <div className="font-bold">{file ? file.name : "اسحب ملف HTML أو ZIP هنا"}</div>
            <div className="text-xs text-muted-foreground mt-1">.html أو .zip (لعبة كاملة بملفاتها)</div>
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

          {busy && progress && (
            <div className="text-sm text-center bg-secondary/60 rounded-xl px-3 py-2 font-medium">{progress}</div>
          )}

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
