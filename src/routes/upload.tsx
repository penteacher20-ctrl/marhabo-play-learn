import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { CheckCircle2, Loader2, XCircle, Circle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { createZipUploadPlan, validateZipGame } from "@/lib/zipUpload.functions";

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

const MAX_FILES = 200;
const MAX_TOTAL = 50 * 1024 * 1024;
const MAX_ONE = 8 * 1024 * 1024;

type Mode = "html" | "zip" | "embed";
type StageStatus = "pending" | "active" | "done" | "error";
interface Stage { key: string; label: string; status: StageStatus; detail?: string; pct?: number }

const ALLOWED_EMBED_HOSTS = [
  "wordwall.net", "youtube.com", "youtu.be", "youtube-nocookie.com",
  "vimeo.com", "player.vimeo.com", "scratch.mit.edu", "learningapps.org",
  "h5p.org", "h5p.com", "genially.com", "view.genially.com",
  "quizlet.com", "kahoot.it", "educandy.com", "flip.com",
  "lovableproject.com", "lovable.app", "lovable.dev",
  "netlify.app", "vercel.app", "github.io", "pages.dev", "codepen.io",
];

function extractEmbedUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  const url = m ? m[1] : s;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (!ALLOWED_EMBED_HOSTS.some((h) => host === h || host.endsWith("." + h))) return null;
    return u.toString();
  } catch { return null; }
}

function UploadPage() {
  const { tr } = useI18n();
  const { user, loading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("embed");
  const [file, setFile] = useState<File | null>(null);
  const [embedCode, setEmbedCode] = useState("");
  const [embedSize, setEmbedSize] = useState<"responsive" | "fixed">("responsive");
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedHeight, setEmbedHeight] = useState("600");
  const [embedAspect, setEmbedAspect] = useState("16/10");
  const [thumb, setThumb] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [overallPct, setOverallPct] = useState(0);
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

  const acceptExt = mode === "zip" ? ".zip" : ".html,.htm";
  const validateExt = (f: File) => {
    const n = f.name.toLowerCase();
    if (mode === "zip") return n.endsWith(".zip");
    return n.endsWith(".html") || n.endsWith(".htm");
  };

  const accept = (f: File | null) => {
    if (!f) return;
    if (!validateExt(f)) {
      toast.error(mode === "zip" ? "الرجاء اختيار ملف .zip" : "الرجاء اختيار ملف .html");
      return;
    }
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0]); };

  const safe = (n: string) => n.replace(/[^a-zA-Z0-9._/-]/g, "_");
  const BAD_PATH = /(^|\/)\.\.($|\/)|\\|^\/|:/;

  const setStage = (key: string, patch: Partial<Stage>) =>
    setStages((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const runUpload = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!title) { toast.error("املأ العنوان"); return; }
    if (!isAdmin && mode !== "embed") {
      toast.error("رفع الملفات متاح للإدارة فقط — استخدم كود التضمين أو القوالب المتاحة");
      return;
    }
    if (mode === "embed") {
      const url = extractEmbedUrl(embedCode);
      if (!url) { toast.error("رمز التضمين غير صالح — الصق كود <iframe> أو رابط https من منصّة مدعومة"); return; }
      // Build sizing hash appended to the URL so the player can restore user preferences.
      // Hash is not sent to the remote server, so it never affects the embed request.
      let finalUrl = url;
      try {
        const params = new URLSearchParams();
        if (embedSize === "responsive") {
          params.set("size", "responsive");
          if (embedAspect) params.set("ar", embedAspect);
        } else {
          params.set("size", "fixed");
          params.set("w", embedWidth || "100%");
          params.set("h", /^\d+$/.test(embedHeight) ? `${embedHeight}px` : (embedHeight || "600px"));
        }
        const u = new URL(url);
        u.hash = `lv=${params.toString()}`;
        finalUrl = u.toString();
      } catch { /* fall back to plain url */ }
      setBusy(true); setOverallPct(0);
      setStages([{ key: "save", label: "حفظ اللعبة", status: "active" }]);
      try {
        const ts = Date.now();
        let thumbUrl: string | null = null;
        if (thumb) {
          const tp = `${user.id}/${ts}-${safe(thumb.name)}`;
          const { error: tErr } = await supabase.storage.from("thumbnails").upload(tp, thumb);
          if (!tErr) thumbUrl = supabase.storage.from("thumbnails").getPublicUrl(tp).data.publicUrl;
        }
        const { data: game, error: gErr } = await supabase.from("games").insert({
          user_id: user.id, title, description: desc, type: "embed", file_url: finalUrl, thumbnail_url: thumbUrl, is_public: isPublic,
        }).select().single();
        if (gErr) throw new Error(`فشل الحفظ: ${gErr.message}`);
        setStages([{ key: "save", label: "حفظ اللعبة", status: "done" }]);
        setOverallPct(100);
        toast.success("تم حفظ اللعبة بنجاح! 🎉");
        navigate({ to: "/play/$gameId", params: { gameId: game.id } });
      } catch (err: any) {
        const msg = err?.message ?? "خطأ";
        setStages([{ key: "save", label: "حفظ اللعبة", status: "error", detail: msg }]);
        toast.error(msg);
      } finally { setBusy(false); }
      return;
    }
    if (!file) { toast.error("اختر الملف"); return; }
    setBusy(true); setOverallPct(0);

    const initial: Stage[] =
      mode === "zip"
        ? [
            { key: "unzip", label: "فك ضغط الأرشيف", status: "pending" },
            { key: "prepare", label: "تجهيز رفع آمن", status: "pending" },
            { key: "upload", label: "رفع ملفات اللعبة", status: "pending" },
            { key: "validate", label: "تحقق من صحة المحتوى", status: "pending" },
            { key: "save", label: "حفظ اللعبة", status: "pending" },
          ]
        : [
            { key: "upload", label: "رفع ملف HTML", status: "pending" },
            { key: "save", label: "حفظ اللعبة", status: "pending" },
          ];
    setStages(initial);

    try {
      // Ensure fresh session — avoids storage-api RLS failures when the JWT is
      // near expiry or was issued with a rotated signing key.
      try { await supabase.auth.refreshSession(); } catch { /* ignore */ }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("انتهت جلستك، سجّل دخول من جديد");

      const ts = Date.now();
      let publicUrl = "";
      let gameType: "html" | "html-zip" = "html";

      if (mode === "zip") {
        // 1) unzip
        setStage("unzip", { status: "active", detail: "جاري القراءة..." });
        const zip = await JSZip.loadAsync(file);
        const entries = Object.values(zip.files).filter((f) => !f.dir);
        if (!entries.length) throw new Error("الملف المضغوط فارغ");
        if (entries.length > MAX_FILES) throw new Error(`عدد الملفات (${entries.length}) يتجاوز ${MAX_FILES}`);
        for (const en of entries) {
          if (BAD_PATH.test(en.name)) throw new Error(`مسار غير آمن داخل الأرشيف: ${en.name}`);
        }
        const htmls = entries.filter((f) => /\.html?$/i.test(f.name));
        if (!htmls.length) throw new Error("لم يتم العثور على ملف HTML داخل الأرشيف");
        htmls.sort((a, b) => a.name.split("/").length - b.name.split("/").length);
        const indexEntry =
          htmls.find((f) => /^(?:[^/]+\/)?index\.html?$/i.test(f.name)) ?? htmls[0];
        const parts = indexEntry.name.split("/");
        const stripPrefix = parts.length > 1 ? parts.slice(0, -1).join("/") + "/" : "";
        setStage("unzip", { status: "done", detail: `${entries.length} ملف — نقطة الدخول: ${indexEntry.name}` });
        setOverallPct(10);

        // 2) read files locally and ask the server for signed upload URLs.
        // This avoids the browser-side storage INSERT policy that is currently
        // rejecting files such as offline.js, while keeping user ownership checks.
        setStage("prepare", { status: "active", detail: "فحص الملفات وتجهيز الروابط..." });
        const preparedFiles: Array<{ rel: string; blob: Blob; contentType: string; size: number }> = [];
        let total = 0;
        for (const entry of entries) {
          let rel = entry.name;
          if (stripPrefix && rel.startsWith(stripPrefix)) rel = rel.slice(stripPrefix.length);
          if (!rel) continue;
          rel = safe(rel);
          const ext = rel.split(".").pop()?.toLowerCase() ?? "";
          const contentType = MIME[ext] ?? "application/octet-stream";
          const blob = await entry.async("blob");
          if (blob.size > MAX_ONE) throw new Error(`الملف ${rel} أكبر من ${MAX_ONE / 1024 / 1024}MB`);
          total += blob.size;
          if (total > MAX_TOTAL) throw new Error(`الحجم الإجمالي يتجاوز ${MAX_TOTAL / 1024 / 1024}MB`);
          preparedFiles.push({ rel, blob, contentType, size: blob.size });
        }

        let indexRel = indexEntry.name;
        if (stripPrefix && indexRel.startsWith(stripPrefix)) indexRel = indexRel.slice(stripPrefix.length);
        indexRel = safe(indexRel);
        const plan = await createZipUploadPlan({
          data: {
            title,
            indexRel,
            files: preparedFiles.map(({ rel, size, contentType }) => ({ rel, size, contentType })),
          },
        });
        setStage("prepare", { status: "done", detail: `${preparedFiles.length} رابط رفع آمن` });
        setOverallPct(18);

        // 3) upload each file using its signed upload token.
        setStage("upload", { status: "active", detail: `0 / ${preparedFiles.length}`, pct: 0 });
        let done = 0;
        for (const signedFile of plan.files) {
          const prepared = preparedFiles.find((item) => item.rel === signedFile.rel);
          if (!prepared) throw new Error(`ملف مفقود قبل الرفع: ${signedFile.rel}`);
          const { error: upErr } = await supabase.storage
            .from("game-files")
            .uploadToSignedUrl(signedFile.path, signedFile.token, prepared.blob, {
              contentType: signedFile.contentType,
              upsert: true,
            });
          if (upErr) throw new Error(`فشل رفع "${signedFile.rel}": ${upErr.message}`);
          done++;
          const pct = Math.round((done / preparedFiles.length) * 100);
          setStage("upload", { detail: `${done} / ${preparedFiles.length}`, pct });
          setOverallPct(18 + Math.round((done / preparedFiles.length) * 62));
        }
        publicUrl = supabase.storage.from("game-files").getPublicUrl(plan.indexPath).data.publicUrl;
        gameType = "html-zip";
        setStage("upload", { status: "done", detail: `${done} ملف — ${(total / 1024 / 1024).toFixed(2)}MB` });
        setOverallPct(82);

        // 4) server-side validation
        setStage("validate", { status: "active", detail: "تحقق من index.html والحدود..." });
        try {
          const res = await validateZipGame({ data: { title, indexUrl: publicUrl, folderPath: plan.baseFolder } });
          setStage("validate", { status: "done", detail: `تم التحقق (${res.count} ملف)` });
        } catch (e: any) {
          throw new Error(`فشل التحقق: ${e?.message ?? "خطأ غير معروف"}`);
        }
        setOverallPct(92);
      } else {
        setStage("upload", { status: "active", detail: file.name, pct: 0 });
        const filePath = `${user.id}/${ts}-${safe(file.name)}`;
        const { error: upErr } = await supabase.storage.from("game-files").upload(filePath, file, { contentType: "text/html" });
        if (upErr) throw new Error(`فشل الرفع: ${upErr.message}`);
        publicUrl = supabase.storage.from("game-files").getPublicUrl(filePath).data.publicUrl;
        setStage("upload", { status: "done", detail: file.name, pct: 100 });
        setOverallPct(80);
      }

      // Thumbnail (optional)
      let thumbUrl: string | null = null;
      if (thumb) {
        const tp = `${user.id}/${ts}-${safe(thumb.name)}`;
        const { error: tErr } = await supabase.storage.from("thumbnails").upload(tp, thumb);
        if (!tErr) thumbUrl = supabase.storage.from("thumbnails").getPublicUrl(tp).data.publicUrl;
      }

      // Save
      setStage("save", { status: "active", detail: "حفظ في قاعدة البيانات..." });
      const { data: game, error: gErr } = await supabase.from("games").insert({
        user_id: user.id, title, description: desc, type: gameType, file_url: publicUrl, thumbnail_url: thumbUrl, is_public: isPublic,
      }).select().single();
      if (gErr) throw new Error(`فشل الحفظ: ${gErr.message}`);
      setStage("save", { status: "done" });
      setOverallPct(100);

      toast.success("تم رفع اللعبة بنجاح! 🎉");
      // Instant preview inside player
      navigate({ to: "/play/$gameId", params: { gameId: game.id } });
    } catch (err: any) {
      const msg = err?.message ?? "خطأ أثناء الرفع";
      setStages((prev) => {
        const active = prev.find((s) => s.status === "active");
        if (active) return prev.map((s) => (s.key === active.key ? { ...s, status: "error", detail: msg } : s));
        return [...prev, { key: "err", label: "خطأ", status: "error", detail: msg }];
      });
      toast.error(msg);
    } finally { setBusy(false); }
  };

  const canRetry = !busy && stages.some((s) => s.status === "error");

  return (
    <Wrapper>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display font-black text-center mb-2">{tr("upload_title")}</h1>
        <p className="text-center text-muted-foreground mb-8">{tr("upload_sub")}</p>

        <form onSubmit={runUpload} className="card-pop p-8 space-y-5">
          <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
            {/* Mode selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ModeCard
                active={mode === "html"}
                onClick={() => { setMode("html"); setFile(null); setStages([]); }}
                icon="📄"
                title="ملف HTML واحد"
                desc="لعبة داخل ملف .html مستقل بدون أصول خارجية."
              />
              <ModeCard
                active={mode === "zip"}
                onClick={() => { setMode("zip"); setFile(null); setStages([]); }}
                icon="🗜️"
                title="أرشيف ZIP كامل"
                desc="لعبة متعددة الملفات داخل .zip، مع index.html."
              />
              <ModeCard
                active={mode === "embed"}
                onClick={() => { setMode("embed"); setFile(null); setStages([]); }}
                icon="🔗"
                title="رمز تضمين (iframe)"
                desc="ألصق كود <iframe> من Wordwall / YouTube / LearningApps..."
              />
            </div>

            {mode === "embed" ? (
              <label className="block">
                <span className="block text-sm font-bold mb-1.5">رمز التضمين أو رابط اللعبة</span>
                <textarea
                  value={embedCode}
                  onChange={(e) => setEmbedCode(e.target.value)}
                  rows={4}
                  dir="ltr"
                  className="input font-mono text-xs"
                  placeholder='<iframe src="https://wordwall.net/ar/embed/..." width="500" height="380"></iframe>'
                />
                <span className="block text-xs text-muted-foreground mt-1.5">
                  المنصّات المدعومة: Wordwall، YouTube، Vimeo، Scratch، LearningApps، H5P، Genially، Quizlet، Kahoot، Educandy، Flip.
                </span>
                {embedCode && (
                  <div className="mt-2 text-xs">
                    {extractEmbedUrl(embedCode)
                      ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> رمز صالح</span>
                      : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="w-3.5 h-3.5" /> رمز غير صالح أو منصّة غير مدعومة</span>}
                  </div>
                )}
                <div className="mt-4 rounded-2xl border-2 border-border bg-background/60 p-3 space-y-3">
                  <div className="text-sm font-bold">📐 مقاس العرض</div>
                  <div className="flex gap-1 p-1 bg-secondary/50 rounded-full w-fit">
                    <button type="button" onClick={() => setEmbedSize("responsive")} className={`px-4 py-1.5 rounded-full text-xs font-bold ${embedSize === "responsive" ? "text-white" : "text-foreground"}`} style={embedSize === "responsive" ? { background: "var(--gradient-primary)" } : {}}>متجاوب (موصى به)</button>
                    <button type="button" onClick={() => setEmbedSize("fixed")} className={`px-4 py-1.5 rounded-full text-xs font-bold ${embedSize === "fixed" ? "text-white" : "text-foreground"}`} style={embedSize === "fixed" ? { background: "var(--gradient-primary)" } : {}}>ثابت</button>
                  </div>
                  {embedSize === "responsive" ? (
                    <label className="block">
                      <span className="block text-xs font-bold mb-1">نسبة العرض إلى الارتفاع</span>
                      <select value={embedAspect} onChange={(e) => setEmbedAspect(e.target.value)} className="input text-sm">
                        <option value="16/9">16:9 (فيديو عريض)</option>
                        <option value="16/10">16:10 (افتراضي)</option>
                        <option value="4/3">4:3 (تقليدي)</option>
                        <option value="1/1">1:1 (مربع)</option>
                        <option value="3/4">3:4 (طولي)</option>
                        <option value="9/16">9:16 (موبايل)</option>
                      </select>
                      <span className="block text-xs text-muted-foreground mt-1">يتكيّف تلقائيًا مع الجوال والحاسوب.</span>
                    </label>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-xs font-bold mb-1">العرض</span>
                        <input value={embedWidth} onChange={(e) => setEmbedWidth(e.target.value)} className="input text-sm" placeholder="100% أو 500px" />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-bold mb-1">الارتفاع (px)</span>
                        <input value={embedHeight} onChange={(e) => setEmbedHeight(e.target.value)} className="input text-sm" placeholder="600" inputMode="numeric" />
                      </label>
                      <span className="col-span-2 block text-xs text-muted-foreground">قد لا يظهر جيدًا على الجوال إذا كان العرض بالبكسل.</span>
                    </div>
                  )}
                </div>
              </label>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                className={`block border-3 border-dashed rounded-3xl p-8 text-center cursor-pointer transition ${drag ? "border-primary bg-primary/5" : "border-border bg-secondary/40"}`}
                style={{ borderWidth: 3 }}
              >
                <input type="file" accept={acceptExt} hidden onChange={(e) => accept(e.target.files?.[0] ?? null)} />
                <div className="text-4xl mb-2">{mode === "zip" ? "🗜️" : "📂"}</div>
                <div className="font-bold">{file ? file.name : (mode === "zip" ? "اسحب ملف .zip هنا" : "اسحب ملف .html هنا")}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {mode === "zip"
                    ? `يجب أن يحتوي على index.html — حد أقصى ${MAX_FILES} ملف و${MAX_TOTAL / 1024 / 1024}MB`
                    : "ملف واحد بامتداد .html"}
                </div>
                {file && (
                  <div className="mt-2 inline-flex items-center gap-2 text-xs bg-background rounded-full px-3 py-1 border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    {mode === "zip" ? "أرشيف ZIP" : "ملف HTML"} — {(file.size / 1024).toFixed(1)}KB
                  </div>
                )}
              </label>
            )}

            <Field label={tr("game_title")}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required maxLength={200} />
            </Field>
            <Field label={tr("game_desc")}>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input" maxLength={1000} />
            </Field>
            <Field label={tr("thumbnail")}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setThumb(f);
                  if (f) setThumbPreview(URL.createObjectURL(f));
                  else setThumbPreview(null);
                }}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                📐 الأبعاد المُوصى بها: <strong>16:9</strong> مثل <strong>1280×720</strong> أو <strong>640×360</strong> بكسل. سيتم عرضها في بطاقات اللعبة بنفس نسبة العرض. الحدّ الأقصى 8MB.
              </p>
              {thumbPreview && (
                <div className="mt-2 aspect-video rounded-2xl overflow-hidden border-2 border-border bg-secondary w-56 sm:w-72">
                  <img src={thumbPreview} alt="معاينة الصورة المصغرة" className="w-full h-full object-cover" />
                </div>
              )}
            </Field>


            <div className="flex items-center justify-between bg-secondary/50 rounded-2xl px-4 py-3">
              <span className="font-bold">{tr("privacy")}</span>
              <div className="flex gap-1 p-1 bg-background rounded-full">
                <button type="button" onClick={() => setIsPublic(true)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${isPublic ? "text-white" : "text-foreground"}`} style={isPublic ? { background: "var(--green-fun)" } : {}}>{tr("public")}</button>
                <button type="button" onClick={() => setIsPublic(false)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${!isPublic ? "text-white bg-foreground" : "text-foreground"}`}>{tr("private")}</button>
              </div>
            </div>
          </fieldset>

          {stages.length > 0 && (
            <div className="rounded-2xl border-2 border-border bg-background/60 p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>التقدّم الكلي</span><span>{overallPct}%</span>
                </div>
                <Progress value={overallPct} className="h-2" />
              </div>
              <ul className="space-y-2">
                {stages.map((s) => (
                  <li key={s.key} className="flex items-start gap-2 text-sm">
                    <StatusIcon status={s.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold ${s.status === "error" ? "text-destructive" : ""}`}>{s.label}</span>
                        {typeof s.pct === "number" && s.status === "active" && (
                          <span className="text-xs text-muted-foreground">{s.pct}%</span>
                        )}
                      </div>
                      {s.detail && (
                        <div className={`text-xs mt-0.5 ${s.status === "error" ? "text-destructive" : "text-muted-foreground"} break-words`}>
                          {s.detail}
                        </div>
                      )}
                      {typeof s.pct === "number" && s.status === "active" && (
                        <Progress value={s.pct} className="h-1.5 mt-1.5" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {canRetry && (
                <button
                  type="button"
                  onClick={() => runUpload()}
                  className="bubble-btn text-white w-full text-sm"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  🔄 إعادة المحاولة
                </button>
              )}
            </div>
          )}

          <button disabled={busy} className="bubble-btn text-white w-full disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
            {busy ? "جاري الرفع..." : `🚀 ${tr("upload_now")}`}
          </button>
        </form>
      </div>
      <style>{`.input{width:100%;padding:.75rem 1rem;border-radius:1rem;background:hsl(0 0% 100%);border:2px solid var(--color-border);font:inherit;outline:none;transition:border-color .2s}.input:focus{border-color:var(--color-primary)}`}</style>
    </Wrapper>
  );
}

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === "done") return <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />;
  if (status === "error") return <XCircle className="w-5 h-5 text-destructive shrink-0" />;
  if (status === "active") return <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />;
  return <Circle className="w-5 h-5 text-muted-foreground shrink-0" />;
}

function ModeCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: string; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-right p-4 rounded-2xl border-2 transition ${active ? "border-primary bg-primary/5 shadow" : "border-border bg-secondary/30 hover:border-primary/50"}`}
    >
      <div className="flex items-center gap-2 mb-1"><span className="text-xl">{icon}</span><span className="font-extrabold">{title}</span></div>
      <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
    </button>
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
