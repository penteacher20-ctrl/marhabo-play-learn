import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/games/$gameId/edit")({ component: EditGame });

function EditGame() {
  const { gameId } = Route.useParams();
  const { tr } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [newThumb, setNewThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/auth" }); return; }
    if (!user) return;
    supabase.from("games").select("*").eq("id", gameId).maybeSingle().then(({ data }) => {
      if (!data) { setNotFound(true); return; }
      if ((data as any).user_id !== user.id) { setNotFound(true); return; }
      setTitle((data as any).title);
      setDesc((data as any).description ?? "");
      setIsPublic((data as any).is_public);
      setThumbUrl((data as any).thumbnail_url);
    });
  }, [gameId, user, loading, navigate]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let thumbnail_url = thumbUrl;
      if (newThumb) {
        const safeName = newThumb.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("thumbnails").upload(path, newThumb);
        if (error) throw error;
        thumbnail_url = supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("games").update({ title, description: desc, is_public: isPublic, thumbnail_url }).eq("id", gameId);
      if (error) throw error;
      toast.success("تم الحفظ ✅");
      navigate({ to: "/dashboard" });
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("هل أنت متأكد من حذف اللعبة؟")) return;
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    navigate({ to: "/dashboard" });
  };

  if (notFound) return <Wrapper><div className="card-pop p-10 text-center max-w-md mx-auto"><p>اللعبة غير موجودة أو ليست لك.</p></div></Wrapper>;

  return (
    <Wrapper>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-black text-center mb-8">تعديل اللعبة</h1>
        <div className="card-pop p-8 space-y-5">
          <Field label={tr("game_title")}><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></Field>
          <Field label={tr("game_desc")}><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input" /></Field>
          <Field label={tr("thumbnail")}>
            {thumbUrl && <img src={thumbUrl} alt="" className="w-32 h-20 object-cover rounded-xl mb-2" />}
            <input type="file" accept="image/*" onChange={(e) => setNewThumb(e.target.files?.[0] ?? null)} className="text-sm" />
          </Field>
          <div className="flex items-center justify-between bg-secondary/50 rounded-2xl px-4 py-3">
            <span className="font-bold">{tr("privacy")}</span>
            <div className="flex gap-1 p-1 bg-background rounded-full">
              <button type="button" onClick={() => setIsPublic(true)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${isPublic ? "text-white" : ""}`} style={isPublic ? { background: "var(--green-fun)" } : {}}>{tr("public")}</button>
              <button type="button" onClick={() => setIsPublic(false)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${!isPublic ? "text-white bg-foreground" : ""}`}>{tr("private")}</button>
            </div>
          </div>

          <div className="flex gap-3">
            <button disabled={busy} onClick={save} className="bubble-btn text-white flex-1 disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>{busy ? "..." : "💾 حفظ"}</button>
            <button onClick={remove} className="bubble-btn text-white" style={{ background: "var(--coral)" }}>🗑 حذف</button>
          </div>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.75rem 1rem;border-radius:1rem;background:#fff;border:2px solid var(--color-border);font:inherit;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
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
