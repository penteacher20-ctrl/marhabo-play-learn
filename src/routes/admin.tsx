import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useRoles } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { listAdmins, addAdminByEmail, removeAdmin } from "@/lib/admin.functions";
import { useAuth as useAuthForIcon } from "@/lib/auth";

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

function AdminPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"templates" | "users">("templates");
  const ar = lang === "ar";

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!rolesLoading && user && !isAdmin) navigate({ to: "/" });
  }, [rolesLoading, user, isAdmin, navigate]);

  if (authLoading || rolesLoading || !user || !isAdmin) {
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
      <main className="container mx-auto px-4 py-10 flex-1">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-4xl font-display font-black">
            {ar ? "لوحة الإدارة" : "Admin Panel"}{" "}
            <span className="text-sm font-bold text-primary align-middle">
              {isSuperAdmin ? (ar ? "(سوبر أدمن)" : "(Super Admin)") : (ar ? "(أدمن)" : "(Admin)")}
            </span>
          </h1>
          <div className="flex gap-2 p-1.5 bg-secondary/70 rounded-full">
            <TabBtn active={tab === "templates"} onClick={() => setTab("templates")}>
              {ar ? "القوالب" : "Templates"}
            </TabBtn>
            {isSuperAdmin && (
              <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
                {ar ? "الأدمنز" : "Admins"}
              </TabBtn>
            )}
          </div>
        </div>

        {tab === "templates" ? <TemplatesAdmin ar={ar} /> : <AdminsAdmin ar={ar} />}
      </main>
      <Footer />
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-5 py-2 rounded-full text-sm font-bold transition ${active ? "bg-background text-primary shadow-sm" : "text-foreground/70 hover:text-primary"}`}>
      {children}
    </button>
  );
}

function TemplatesAdmin({ ar }: { ar: boolean }) {
  const [rows, setRows] = useState<Tpl[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => supabase.from("templates").select("*").order("sort_order").then(({ data }) => setRows((data as Tpl[]) ?? []));
  useEffect(() => { load(); }, []);

  const save = async (id: string, patch: Partial<Tpl>) => {
    setBusy(id);
    const { error } = await supabase.from("templates").update(patch).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(ar ? "تم الحفظ" : "Saved"); load(); }
  };

  return (
    <div className="grid gap-4">
      <NewTemplateForm ar={ar} onCreated={load} />

      {rows.map((t) => (
        <div key={t.id} className="card-pop p-5 grid md:grid-cols-[80px_1fr_auto] gap-4 items-start">
          <input
            defaultValue={t.icon ?? ""}
            onBlur={(e) => e.target.value !== (t.icon ?? "") && save(t.id, { icon: e.target.value })}
            className="input text-4xl text-center h-20"
            maxLength={4}
          />
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
          <div className="text-xs text-muted-foreground">
            <div className="font-mono">{t.slug}</div>
            {busy === t.id && <div className="mt-1">...</div>}
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
        <Field label={ar ? "الأيقونة" : "Icon"}><input value={f.icon} onChange={(e) => upd("icon", e.target.value)} className="input text-2xl" maxLength={4} /></Field>
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

