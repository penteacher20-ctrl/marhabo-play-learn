import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  createSuggestion,
  getUserSuggestions,
  getSuggestionMessages,
  sendSuggestionMessage,
} from "@/lib/suggestions.functions";

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
interface ThreadMsg {
  id: string;
  sender_id: string;
  is_admin: boolean;
  body: string;
  image_paths: string[];
  images: string[];
  created_at: string;
  sender_name: string | null;
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

async function uploadImages(files: File[], userId: string): Promise<string[]> {
  const paths: string[] = [];
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) throw new Error("Max 5MB per image");
    const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("suggestion-images").upload(path, f, {
      contentType: f.type || undefined, upsert: false,
    });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

function SuggestionsPage() {
  const { lang, tr } = useI18n();
  const ar = lang === "ar";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<MySugg[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const load = async () => {
    try { setMine((await getUserSuggestions()) as MySugg[]); }
    catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my-suggs-${user.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "suggestions", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr].slice(0, 8));
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !desc.trim()) { toast.error(ar?"العنوان والوصف مطلوبان":"Title and description required"); return; }
    setBusy(true);
    try {
      const image_paths = files.length ? await uploadImages(files, user.id) : [];
      await createSuggestion({ data: { title, description: desc, link_url: link || null, image_paths } });
      toast.success(tr("sugg_sent"));
      setTitle(""); setDesc(""); setLink(""); setFiles([]);
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
            <span className="text-sm font-bold block mb-1">
              {tr("sugg_form_image")} <span className="text-muted-foreground text-xs">({ar?"حتى 8 صور":"up to 8"})</span>
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="bubble-btn bg-secondary hover:bg-secondary/70 cursor-pointer text-sm">
                📷 {ar?"إضافة صور":"Add images"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
              </label>
              {previews.map((p, i) => (
                <div key={p.url} className="relative">
                  <img src={p.url} alt="" className="h-20 w-20 rounded-2xl object-cover border-2 border-border" />
                  <button type="button" onClick={() => removeFile(i)} className="absolute -top-2 -end-2 bg-destructive text-white w-6 h-6 rounded-full text-xs font-bold">✕</button>
                </div>
              ))}
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
              {mine.map((s) => (
                <button key={s.id} onClick={() => setOpenId(s.id)} className="card-pop p-5 text-start hover:shadow-lg transition">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-bold text-lg">{s.title}</h3>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString(ar?"ar-EG":"en")}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status]}`}>{statusLabel(s.status, ar)}</span>
                  </div>
                  <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{s.description}</p>
                  <div className="text-xs text-primary font-bold mt-2">💬 {ar?"فتح المحادثة":"Open chat"}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />

      {openId && user && (
        <ChatModal suggestionId={openId} onClose={() => setOpenId(null)} ar={ar} selfId={user.id} isAdmin={false} />
      )}

      <style>{`.input{width:100%;padding:.65rem .9rem;border-radius:.9rem;background:#fff;border:2px solid var(--color-border);font:inherit;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

export function ChatModal({ suggestionId, onClose, ar, selfId, isAdmin, headerExtra }: {
  suggestionId: string; onClose: () => void; ar: boolean; selfId: string; isAdmin: boolean;
  headerExtra?: React.ReactNode;
}) {
  const [msgs, setMsgs] = useState<ThreadMsg[]>([]);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const load = async () => {
    try {
      const rows = await getSuggestionMessages({ data: { suggestion_id: suggestionId } });
      setMsgs(rows as ThreadMsg[]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [suggestionId]);

  useEffect(() => {
    const ch = supabase
      .channel(`sugg-thread-${suggestionId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "suggestion_messages", filter: `suggestion_id=eq.${suggestionId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [suggestionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 8));
  };

  const send = async () => {
    if (sending) return;
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    try {
      const image_paths = files.length ? await uploadImages(files, selfId) : [];
      await sendSuggestionMessage({ data: { suggestion_id: suggestionId, body, image_paths } });
      setBody(""); setFiles([]);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60" onClick={onClose}>
      <div className="bg-background rounded-3xl shadow-2xl max-w-2xl w-full h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="font-display font-black text-lg">💬 {ar?"المحادثة":"Conversation"}</div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground leading-none">✕</button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
          {loading && <div className="text-center text-muted-foreground text-sm">...</div>}
          {!loading && msgs.length === 0 && (
            <div className="text-center text-muted-foreground text-sm">{ar?"لا توجد رسائل بعد":"No messages yet"}</div>
          )}
          {msgs.map((m) => {
            const mine = m.sender_id === selfId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm border ${
                  mine ? "bg-primary text-primary-foreground border-primary" : m.is_admin ? "bg-amber-50 border-amber-200" : "bg-white border-border"
                }`}>
                  <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {m.is_admin && <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px]">{ar?"إدارة":"Admin"}</span>}
                    <span>{m.sender_name || (mine ? (ar?"أنت":"You") : (ar?"مستخدم":"User"))}</span>
                    <span>• {new Date(m.created_at).toLocaleString(ar?"ar-EG":"en", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                  </div>
                  {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.images && m.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {m.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="" className="rounded-lg max-h-48 w-full object-cover border border-border/50" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border bg-background space-y-2">
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previews.map((p, i) => (
                <div key={p.url} className="relative">
                  <img src={p.url} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />
                  <button onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))} className="absolute -top-1.5 -end-1.5 bg-destructive text-white w-5 h-5 rounded-full text-[10px] font-bold">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="shrink-0 h-10 w-10 grid place-items-center rounded-full bg-secondary hover:bg-secondary/70 cursor-pointer text-lg">
              📷
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={ar?"اكتب رسالتك...":"Type your message..."}
              className="flex-1 resize-none rounded-2xl border-2 border-border px-3 py-2 max-h-32 min-h-[40px] outline-none focus:border-primary bg-white"
            />
            <button
              onClick={send}
              disabled={sending || (!body.trim() && files.length === 0)}
              className="shrink-0 h-10 px-4 rounded-full text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
            >
              {sending ? "..." : (ar?"إرسال":"Send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
