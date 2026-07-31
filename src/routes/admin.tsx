import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LayoutGrid, MessageSquare, Palette, Users, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { listAdmins, addAdminByEmail, removeAdmin } from "@/lib/admin.functions";
import { useAuth as useAuthForIcon } from "@/lib/auth";
import { getAllSuggestions, getSuggestionById, updateSuggestionStatus, deleteSuggestion, signSuggestionImage } from "@/lib/suggestions.functions";
import { ChatModal } from "@/routes/suggestions";

const isIconUrl = (v: string | null | undefined) => !!v && /^https?:\/\//i.test(v);

async function uploadTemplateIcon(file: File, userId: string): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/templates/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("thumbnails").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
  return data.publicUrl;
}

function IconPicker({ value, onChange, size = "lg" }: { value: string; onChange: (v: string) => void; size?: "lg" | "md" }) {
  const { user } = useAuthForIcon();
  const [busy, setBusy] = useState(false);
  const isUrl = isIconUrl(value);
  const boxCls = size === "lg" ? "h-20 w-20 text-4xl" : "h-14 w-14 text-2xl";

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setBusy(true);
    try {
      const url = await uploadTemplateIcon(file, user.id);
      onChange(url);
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${boxCls} rounded-2xl border-2 border-border bg-white flex items-center justify-center overflow-hidden relative`}>
        {isUrl ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{value || "🎮"}</span>
        )}
        {busy && <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs">...</div>}
      </div>
      <label className="text-[10px] font-bold text-primary cursor-pointer hover:underline">
        📷 رفع
        <input type="file" accept="image/*" className="hidden" onChange={pick} />
      </label>
      {isUrl && (
        <button type="button" onClick={() => onChange("🎮")} className="text-[10px] text-muted-foreground hover:text-destructive">✕ إزالة</button>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin")({ component: AdminPage });

interface Tpl {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  is_available: boolean;
  sort_order: number;
  external_url: string | null;
}

type TabKey = "templates" | "suggestions" | "site" | "users";

function AdminPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("templates");
  const ar = lang === "ar";

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!rolesLoading && user && !isAdmin) navigate({ to: "/" });
  }, [rolesLoading, user, isAdmin, navigate]);

  if (authLoading || rolesLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="container mx-auto px-4 py-12 flex-1 text-center text-muted-foreground">...</main>
      </div>
    );
  }

  const nav: { key: TabKey; label: string; icon: typeof LayoutGrid; show: boolean; hint: string }[] = [
    { key: "templates", label: ar ? "القوالب" : "Templates", icon: LayoutGrid, show: true, hint: ar ? "إدارة قوالب الألعاب" : "Manage game templates" },
    { key: "suggestions", label: ar ? "الاقتراحات" : "Suggestions", icon: MessageSquare, show: true, hint: ar ? "ملاحظات المستخدمين" : "User feedback" },
    { key: "site", label: ar ? "هوية الموقع" : "Site Identity", icon: Palette, show: true, hint: ar ? "اللوجو والأيقونة" : "Logo and favicon" },
    { key: "users", label: ar ? "الأدمنز" : "Admins", icon: Users, show: isSuperAdmin, hint: ar ? "صلاحيات الفريق" : "Team permissions" },
  ];

  const current = nav.find((n) => n.key === tab) ?? nav[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{ar ? "مِرحابو · لوحة الإدارة" : "Marhabo · Admin"}</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 truncate">
                {ar ? "لوحة الإدارة" : "Admin Console"}
              </h1>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isSuperAdmin ? "bg-primary/10 text-primary border-primary/30" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {isSuperAdmin ? (ar ? "سوبر أدمن" : "Super Admin") : (ar ? "أدمن" : "Admin")}
            </span>
          </div>

          <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-6">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-20 self-start">
              <nav className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {nav.filter((n) => n.show).map((n) => {
                  const active = n.key === tab;
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.key}
                      onClick={() => setTab(n.key)}
                      className={`shrink-0 lg:shrink w-full text-start flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${
                        active
                          ? "bg-primary text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Content */}
            <section className="min-w-0 admin-scope">
              <div className="mb-5 pb-4 border-b border-slate-200">
                <h2 className="font-display text-2xl font-black text-slate-900 flex items-center gap-2">
                  <current.icon className="w-5 h-5 text-primary" />
                  {current.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{current.hint}</p>
              </div>

              {tab === "templates" && <TemplatesAdmin ar={ar} />}
              {tab === "suggestions" && <SuggestionsAdmin ar={ar} />}
              {tab === "site" && <SiteAdmin ar={ar} />}
              {tab === "users" && <AdminsAdmin ar={ar} />}

              <style>{`
                .admin-scope .card-pop { border-radius: 1rem; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06); border: 1px solid rgb(226 232 240); background: #fff; transition: box-shadow .2s ease; }
                .admin-scope .card-pop:hover { transform: none; box-shadow: 0 2px 4px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.08); }
                .admin-scope .bubble-btn { border-radius: 0.75rem; padding: 0.6rem 1.1rem; box-shadow: 0 1px 2px rgba(15,23,42,0.08); }
                .admin-scope .bubble-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(15,23,42,0.12); }
                .admin-scope .bubble-btn:active { transform: translateY(0); }
                .admin-scope .input { border-radius: 0.6rem !important; }
              `}</style>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


function TemplatesAdmin({ ar }: { ar: boolean }) {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const { isSuperAdmin } = useRoles();

  const load = () => supabase.from("templates").select("*").order("sort_order").then(({ data }) => setRows((data as Tpl[]) ?? []));
  useEffect(() => { load(); }, []);

  const save = async (id: string, patch: Partial<Tpl>) => {
    setBusy(id);
    const { error } = await supabase.from("templates").update(patch).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(ar ? "تم الحفظ" : "Saved"); load(); }
  };

  const remove = async (t: Tpl) => {
    const msg = ar
      ? `حذف قالب "${t.name_ar}"؟\nلن يظهر بعد ذلك لإنشاء ألعاب جديدة، أما الألعاب التي أنشأها المستخدمون من خلاله فستبقى موجودة في حساباتهم ولا يحذفها إلا صاحبها.`
      : `Delete template "${t.name_en}"?\nIt will no longer be available for new games. Games users already created with it stay in their accounts — only their owner can delete them.`;
    if (!confirm(msg)) return;
    setBusy(t.id);
    const { error } = await supabase.from("templates").delete().eq("id", t.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(ar ? "تم حذف القالب" : "Template deleted"); load(); }
  };


  return (
    <div className="grid gap-4">
      <NewTemplateForm ar={ar} onCreated={load} />

      {rows.map((t) => (
        <div key={t.id} className="card-pop p-5 grid md:grid-cols-[80px_1fr_auto] gap-4 items-start">
          <IconPicker value={t.icon ?? ""} onChange={(v) => save(t.id, { icon: v })} size="lg" />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">{ar ? "الاسم عربي" : "Name AR"}</span>
              <input defaultValue={t.name_ar} onBlur={(e) => e.target.value !== t.name_ar && save(t.id, { name_ar: e.target.value })} className="input" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">{ar ? "الاسم إنجليزي" : "Name EN"}</span>
              <input defaultValue={t.name_en} onBlur={(e) => e.target.value !== t.name_en && save(t.id, { name_en: e.target.value })} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-muted-foreground">{ar ? "الوصف عربي" : "Description AR"}</span>
              <input defaultValue={t.description_ar ?? ""} onBlur={(e) => e.target.value !== (t.description_ar ?? "") && save(t.id, { description_ar: e.target.value })} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-muted-foreground">{ar ? "الوصف إنجليزي" : "Description EN"}</span>
              <input defaultValue={t.description_en ?? ""} onBlur={(e) => e.target.value !== (t.description_en ?? "") && save(t.id, { description_en: e.target.value })} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-muted-foreground">
                {ar ? "رابط خارجي (اختياري — iframe جاهز)" : "External URL (optional — ready iframe)"}
              </span>
              <input
                type="url"
                defaultValue={t.external_url ?? ""}
                placeholder="https://wordwall.net/embed/..."
                onBlur={(e) => e.target.value !== (t.external_url ?? "") && save(t.id, { external_url: e.target.value.trim() || null })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">{ar ? "الترتيب" : "Sort"}</span>
              <input type="number" defaultValue={t.sort_order} onBlur={(e) => Number(e.target.value) !== t.sort_order && save(t.id, { sort_order: Number(e.target.value) })} className="input" />
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={t.is_available} onChange={(e) => save(t.id, { is_available: e.target.checked })} className="w-5 h-5" />
              <span className="text-sm font-bold">{ar ? "متاح" : "Available"}</span>
            </label>
          </div>
          <div className="text-xs text-muted-foreground grid gap-2 justify-items-start">
            <div className="font-mono">{t.slug}</div>
            {busy === t.id && <div>...</div>}
            {isSuperAdmin && (
              <button
                onClick={() => remove(t)}
                disabled={busy === t.id}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
              >
                {ar ? "حذف القالب" : "Delete template"}
              </button>
            )}
          </div>

        </div>
      ))}
      <style>{`.input{width:100%;padding:.5rem .75rem;border-radius:.75rem;background:#fff;border:2px solid var(--color-border);font:inherit;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function AdminsAdmin({ ar }: { ar: boolean }) {
  const [list, setList] = useState<{ user_id: string; role: string; email: string | null }[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => listAdmins().then((r) => setList(r as any)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await addAdminByEmail({ data: { email } });
      toast.success(ar ? "تمت الإضافة" : "Added");
      setEmail("");
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const remove = async (user_id: string) => {
    if (!confirm(ar ? "إزالة صلاحية الأدمن؟" : "Remove admin role?")) return;
    try {
      await removeAdmin({ data: { user_id } });
      toast.success(ar ? "تمت الإزالة" : "Removed");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card-pop p-5 flex gap-3 flex-wrap items-end">
        <label className="flex-1 min-w-[240px]">
          <span className="text-sm font-bold block mb-1">{ar ? "إضافة أدمن بالإيميل" : "Add admin by email"}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="user@example.com"
            className="w-full px-4 py-2.5 rounded-full bg-white border-2 border-border focus:border-primary outline-none" />
        </label>
        <button disabled={busy} className="bubble-btn text-white disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
          {busy ? "..." : ar ? "إضافة" : "Add"}
        </button>
      </form>

      <div className="card-pop p-5">
        <h3 className="font-display font-extrabold text-xl mb-3">{ar ? "الأدمنز الحاليون" : "Current admins"}</h3>
        <div className="divide-y divide-border">
          {list.length === 0 && <p className="text-muted-foreground text-sm py-4">{ar ? "لا يوجد" : "None"}</p>}
          {list.map((u) => (
            <div key={u.user_id + u.role} className="flex items-center justify-between py-3 gap-3">
              <div>
                <div className="font-bold">{u.email ?? u.user_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">
                  {u.role === "super_admin" ? (ar ? "سوبر أدمن" : "Super Admin") : (ar ? "أدمن" : "Admin")}
                </div>
              </div>
              {u.role === "admin" && (
                <button onClick={() => remove(u.user_id)} className="px-4 py-1.5 rounded-full text-sm font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 transition">
                  {ar ? "إزالة" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewTemplateForm({ ar, onCreated }: { ar: boolean; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    slug: "", name_ar: "", name_en: "", icon: "🎮",
    description_ar: "", description_en: "", external_url: "", sort_order: 100,
  });
  const upd = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = f.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug || !f.name_ar.trim() || !f.name_en.trim()) {
      toast.error(ar ? "أكمل الحقول الأساسية" : "Fill required fields"); return;
    }
    if (f.external_url && !/^https:\/\/[^\s]+$/i.test(f.external_url.trim())) {
      toast.error(ar ? "الرابط الخارجي يجب أن يبدأ بـ https://" : "External URL must start with https://"); return;
    }
    setBusy(true);
    const { error } = await supabase.from("templates").insert({
      slug, name_ar: f.name_ar.trim(), name_en: f.name_en.trim(),
      icon: f.icon.trim() || "🎮",
      description_ar: f.description_ar.trim() || null,
      description_en: f.description_en.trim() || null,
      external_url: f.external_url.trim() || null,
      sort_order: Number(f.sort_order) || 100,
      is_available: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(ar ? "تم إنشاء القالب" : "Template created");
    setF({ slug: "", name_ar: "", name_en: "", icon: "🎮", description_ar: "", description_en: "", external_url: "", sort_order: 100 });
    setOpen(false); onCreated();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="bubble-btn text-white self-start" style={{ background: "var(--gradient-primary)" }}>
        + {ar ? "قالب جديد (رابط خارجي أو داخلي)" : "New template (external or built-in)"}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card-pop p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-extrabold text-lg">{ar ? "إنشاء قالب جديد" : "Create new template"}</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={ar ? "المُعرّف (slug)" : "Slug"}><input required value={f.slug} onChange={(e) => upd("slug", e.target.value)} className="input" placeholder="my-template" /></Field>
        <Field label={ar ? "الأيقونة (إيموجي أو صورة)" : "Icon (emoji or image)"}>
          <div className="flex items-center gap-3">
            <IconPicker value={f.icon} onChange={(v) => upd("icon", v)} size="md" />
            {!isIconUrl(f.icon) && (
              <input value={f.icon} onChange={(e) => upd("icon", e.target.value)} className="input text-2xl flex-1" maxLength={4} placeholder="🎮" />
            )}
          </div>
        </Field>
        <Field label={ar ? "الاسم عربي *" : "Name AR *"}><input required value={f.name_ar} onChange={(e) => upd("name_ar", e.target.value)} className="input" /></Field>
        <Field label={ar ? "الاسم إنجليزي *" : "Name EN *"}><input required value={f.name_en} onChange={(e) => upd("name_en", e.target.value)} className="input" /></Field>
        <Field label={ar ? "الوصف عربي" : "Description AR"}><input value={f.description_ar} onChange={(e) => upd("description_ar", e.target.value)} className="input" /></Field>
        <Field label={ar ? "الوصف إنجليزي" : "Description EN"}><input value={f.description_en} onChange={(e) => upd("description_en", e.target.value)} className="input" /></Field>
        <div className="sm:col-span-2">
          <Field label={ar ? "رابط خارجي (اختياري — iframe جاهز مثل Wordwall / LearningApps)" : "External URL (optional — Wordwall, LearningApps...)"}>
            <input type="url" value={f.external_url} onChange={(e) => upd("external_url", e.target.value)} className="input" placeholder="https://..." />
          </Field>
        </div>
        <Field label={ar ? "الترتيب" : "Sort"}><input type="number" value={f.sort_order} onChange={(e) => upd("sort_order", Number(e.target.value))} className="input" /></Field>
      </div>
      <button disabled={busy} className="bubble-btn text-white disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
        {busy ? "..." : ar ? "إنشاء" : "Create"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-bold text-muted-foreground block mb-1">{label}</span>{children}</label>;
}


// ============ Suggestions admin ============

interface Sugg {
  id: string; user_id: string; title: string; description: string;
  image_url: string | null; link_url: string | null;
  status: "new" | "reviewed" | "resolved" | "rejected";
  admin_response: string | null; seen_by_admin: boolean;
  created_at: string; author_name?: string | null;
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

function SuggestionsAdmin({ ar }: { ar: boolean }) {
  const [rows, setRows] = useState<Sugg[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Sugg | null>(null);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAllSuggestions({ data: { status: status || undefined, search: search || undefined, page, limit } });
      setRows(r.rows as Sugg[]);
      setTotal(r.total);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status]);

  const open = async (id: string) => {
    try {
      const r = await getSuggestionById({ data: { id } });
      setSelected(r as Sugg);
      // update local list seen state
      setRows((prev) => prev.map((x) => x.id === id ? { ...x, seen_by_admin: true } : x));
    } catch (e: any) { toast.error(e.message); }
  };

  const del = async (id: string) => {
    if (!confirm(ar ? "حذف الاقتراح؟" : "Delete suggestion?")) return;
    try {
      await deleteSuggestion({ data: { id } });
      toast.success(ar ? "تم الحذف" : "Deleted");
      setSelected(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="card-pop p-4 flex gap-3 flex-wrap items-center">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="flex gap-2 flex-1 min-w-[240px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar?"بحث...":"Search..."} className="input flex-1" />
          <button className="bubble-btn text-white" style={{ background: "var(--gradient-primary)" }}>{ar?"بحث":"Search"}</button>
        </form>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input max-w-[180px]">
          <option value="">{ar?"كل الحالات":"All statuses"}</option>
          <option value="new">{statusLabel("new",ar)}</option>
          <option value="reviewed">{statusLabel("reviewed",ar)}</option>
          <option value="resolved">{statusLabel("resolved",ar)}</option>
          <option value="rejected">{statusLabel("rejected",ar)}</option>
        </select>
      </div>

      <div className="card-pop overflow-hidden">
        {loading && <div className="p-6 text-center text-muted-foreground text-sm">...</div>}
        {!loading && rows.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">{ar?"لا توجد اقتراحات":"No suggestions"}</div>
        )}
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-3 flex-wrap hover:bg-secondary/30 transition">
              {!r.seen_by_admin && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-white">{ar?"جديد":"NEW"}</span>
              )}
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {r.author_name || "—"} • {new Date(r.created_at).toLocaleDateString(ar?"ar-EG":"en")}
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status]}`}>{statusLabel(r.status, ar)}</span>
              <button onClick={() => open(r.id)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20">
                {ar?"تفاصيل":"Details"}
              </button>
              <button onClick={() => del(r.id)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive/20">
                {ar?"حذف":"Delete"}
              </button>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-full bg-secondary text-sm disabled:opacity-40">‹</button>
            <span className="text-sm">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-full bg-secondary text-sm disabled:opacity-40">›</button>
          </div>
        )}
      </div>

      {selected && (
        <SuggestionDrawer ar={ar} sugg={selected} onClose={() => setSelected(null)} onSaved={() => { load(); setSelected(null); }} onDelete={() => del(selected.id)} />
      )}
    </div>
  );
}

function SuggestionDrawer({ ar, sugg, onClose, onSaved, onDelete }: {
  ar: boolean; sugg: Sugg; onClose: () => void; onSaved: () => void; onDelete: () => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState(sugg.status);
  const [saving, setSaving] = useState(false);

  const saveStatus = async (next: string) => {
    setStatus(next as any);
    setSaving(true);
    try {
      await updateSuggestionStatus({ data: { id: sugg.id, status: next, admin_response: null } });
      toast.success(ar?"تم تحديث الحالة":"Status updated");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  const header = (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => saveStatus(e.target.value)}
        className={`text-xs font-bold px-2 py-1.5 rounded-full border-2 outline-none ${STATUS_COLORS[status]}`}
      >
        <option value="new">{statusLabel("new",ar)}</option>
        <option value="reviewed">{statusLabel("reviewed",ar)}</option>
        <option value="resolved">{statusLabel("resolved",ar)}</option>
        <option value="rejected">{statusLabel("rejected",ar)}</option>
      </select>
      <button onClick={onDelete} className="text-xs font-bold px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20">
        {ar?"حذف":"Delete"}
      </button>
    </div>
  );

  return (
    <ChatModal
      suggestionId={sugg.id}
      onClose={onClose}
      ar={ar}
      selfId={user.id}
      isAdmin={true}
      headerExtra={header}
    />
  );
}


async function uploadSiteAsset(file: File, userId: string, kind: "logo" | "favicon"): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/site/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("thumbnails").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
  return data.publicUrl;
}

function SiteAdmin({ ar }: { ar: boolean }) {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "logo" | "favicon">(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("logo_url, favicon_url").eq("id", "main").maybeSingle();
    setLogoUrl(data?.logo_url ?? null);
    setFaviconUrl(data?.favicon_url ?? null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: { logo_url?: string | null; favicon_url?: string | null }) => {
    const { error } = await supabase.from("site_settings").update({ ...patch, updated_by: user?.id ?? null }).eq("id", "main");
    if (error) { toast.error(error.message); return false; }
    toast.success(ar ? "تم الحفظ" : "Saved");
    return true;
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(ar ? "الحد الأقصى 2 ميجا" : "Max 2MB"); return; }
    setBusy(kind);
    try {
      const url = await uploadSiteAsset(file, user.id, kind);
      const ok = await save(kind === "logo" ? { logo_url: url } : { favicon_url: url });
      if (ok) { if (kind === "logo") setLogoUrl(url); else setFaviconUrl(url); }
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  const clear = async (kind: "logo" | "favicon") => {
    const ok = await save(kind === "logo" ? { logo_url: null } : { favicon_url: null });
    if (ok) { if (kind === "logo") setLogoUrl(null); else setFaviconUrl(null); }
  };

  if (loading) return <div className="text-center text-muted-foreground py-8">...</div>;

  return (
    <div className="grid gap-5 max-w-3xl">
      <div className="card-pop p-6">
        <h2 className="text-xl font-display font-black mb-1">{ar ? "لوجو الموقع" : "Site Logo"}</h2>
        <p className="text-sm text-muted-foreground mb-4">{ar ? "الصورة اللي هتظهر جنب اسم الموقع في الهيدر (يفضل مربعة، حتى 2 ميجا)." : "Shown next to the brand name in the header (square, up to 2MB)."}</p>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="h-20 w-20 rounded-2xl border-2 border-border bg-white overflow-hidden flex items-center justify-center relative">
            {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" /> : <span className="text-3xl">م</span>}
            {busy === "logo" && <div className="absolute inset-0 bg-white/70 grid place-items-center text-xs">...</div>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="bubble-btn bg-primary text-white cursor-pointer inline-flex items-center gap-2 text-sm">
              📷 {ar ? "رفع لوجو" : "Upload Logo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e, "logo")} />
            </label>
            {logoUrl && (
              <button onClick={() => clear("logo")} className="text-xs font-bold text-destructive hover:underline text-start">
                ✕ {ar ? "إزالة اللوجو" : "Remove logo"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card-pop p-6">
        <h2 className="text-xl font-display font-black mb-1">{ar ? "أيقونة الموقع (Favicon)" : "Favicon"}</h2>
        <p className="text-sm text-muted-foreground mb-4">{ar ? "الأيقونة اللي بتظهر في تبويب المتصفح (PNG أو SVG، مربعة، حتى 2 ميجا)." : "Shown in the browser tab (PNG/SVG, square, up to 2MB)."}</p>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="h-16 w-16 rounded-xl border-2 border-border bg-white overflow-hidden flex items-center justify-center relative">
            {faviconUrl ? <img src={faviconUrl} alt="favicon" className="w-full h-full object-cover" /> : <span className="text-xl">⭐</span>}
            {busy === "favicon" && <div className="absolute inset-0 bg-white/70 grid place-items-center text-xs">...</div>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="bubble-btn bg-primary text-white cursor-pointer inline-flex items-center gap-2 text-sm">
              📷 {ar ? "رفع أيقونة" : "Upload Favicon"}
              <input type="file" accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp" className="hidden" onChange={(e) => pick(e, "favicon")} />
            </label>
            {faviconUrl && (
              <button onClick={() => clear("favicon")} className="text-xs font-bold text-destructive hover:underline text-start">
                ✕ {ar ? "إزالة الأيقونة" : "Remove favicon"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
