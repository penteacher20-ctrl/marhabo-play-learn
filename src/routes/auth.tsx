import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import mascot from "@/assets/mascot-fox.png";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name }, emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("أهلاً بك! 👋");
      }
    } catch (err: any) {
      toast.error(err.message ?? "خطأ");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-10 flex-1 grid md:grid-cols-2 gap-10 items-center">
        <div className="hidden md:block text-center">
          <img src={mascot} alt="" className="w-72 mx-auto float-anim" />
          <h2 className="text-3xl font-display font-black mt-4">{tr("tagline")}</h2>
        </div>
        <form onSubmit={submit} className="card-pop p-8 max-w-md w-full mx-auto space-y-4">
          <h1 className="text-3xl font-display font-black text-center">{mode === "signup" ? tr("signup") : tr("signin")}</h1>

          <button type="button" disabled={busy} onClick={async () => {
            setBusy(true);
            const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
            if (r.error) { toast.error(r.error.message ?? "خطأ"); setBusy(false); return; }
            if (r.redirected) return;
            navigate({ to: "/dashboard" });
          }} className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-white border-2 border-border font-bold hover:border-primary transition disabled:opacity-60">
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"/></svg>
            متابعة باستخدام Google
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> أو <div className="flex-1 h-px bg-border" />
          </div>

          {mode === "signup" && (
            <Field label={tr("name")}><input value={name} onChange={(e) => setName(e.target.value)} className="input" required /></Field>
          )}
          <Field label={tr("email")}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required /></Field>
          <Field label={tr("password")}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required minLength={6} /></Field>

          <button disabled={busy} className="bubble-btn text-white w-full disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
            {busy ? "..." : mode === "signup" ? tr("signup") : tr("signin")}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? tr("have_account") : tr("no_account")}{" "}
            <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-bold text-primary hover:underline">
              {mode === "signup" ? tr("signin") : tr("signup")}
            </button>
          </p>
        </form>
      </main>
      <style>{`.input{width:100%;padding:.75rem 1rem;border-radius:1rem;background:#fff;border:2px solid var(--color-border);font:inherit;outline:none;transition:border-color .2s}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-bold mb-1.5">{label}</span>{children}</label>;
}
