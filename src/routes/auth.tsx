import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
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
