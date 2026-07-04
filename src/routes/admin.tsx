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
