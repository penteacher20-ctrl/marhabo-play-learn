import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useMotion, type MotionPref } from "@/lib/motion";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { lang, tr } = useI18n();
  const { user } = useAuth();
  const { pref, setPref, reduced } = useMotion();
  const ar = lang === "ar";

  const [profile, setProfile] = useState<{ name: string | null; avatar_url: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile((data as any) ?? null);
    });
  }, [user]);

  const handleAvatarChange = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error(ar ? "اختر ملف صورة" : "Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/avatar-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("thumbnails").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(path);
      const avatar_url = urlData.publicUrl;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url }).eq("id", user.id);
      if (dbErr) throw dbErr;
      setProfile((p) => (p ? { ...p, avatar_url } : { name: null, avatar_url }));
      toast.success(tr("avatar_updated"));
    } catch (err: any) {
      toast.error(err?.message || tr("avatar_failed"));
    } finally {
      setUploading(false);
    }
  };

  const options: { value: MotionPref; label: string }[] = [
    { value: "system", label: ar ? "حسب النظام" : "System" },
    { value: "on", label: ar ? "تشغيل" : "On" },
    { value: "off", label: ar ? "إيقاف" : "Off" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-10 flex-1 max-w-2xl">
        <h1 className="text-4xl font-display font-black mb-8">{ar ? "الإعدادات" : "Settings"}</h1>

        {user && (
          <section className="card-pop p-6 space-y-5 mb-6">
            <div>
              <h2 className="text-xl font-display font-extrabold">{tr("profile")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{tr("avatar_upload_hint")}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile?.name || tr("name")}
                    className="w-24 h-24 rounded-3xl object-cover border-4 border-background shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-3xl grid place-items-center text-4xl text-white border-4 border-background shadow-lg" style={{ background: "var(--gradient-primary)" }}>
                    🦊
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-lg truncate">{profile?.name || user.email}</div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarChange(f);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white disabled:opacity-60 transition hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {uploading ? tr("uploading") : tr("change_avatar")}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="card-pop p-6 space-y-4">
          <div>
            <h2 className="text-xl font-display font-extrabold">{ar ? "الحركة والتأثيرات" : "Motion & Animations"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {ar
                ? "تحكّم في انتقالات واهتزازات الواجهة. هذا الخيار يسبق إعداد النظام."
                : "Control UI transitions and wiggles. This setting overrides your system preference."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1.5 bg-secondary/70 rounded-full">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => setPref(o.value)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                  pref === o.value ? "bg-background text-primary shadow-sm" : "text-foreground/70 hover:text-primary"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {ar ? "الحالة الفعلية:" : "Effective state:"}{" "}
            <span className="font-bold text-foreground">
              {reduced ? (ar ? "حركة مُخفّفة" : "Reduced motion") : (ar ? "حركة كاملة" : "Full motion")}
            </span>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
