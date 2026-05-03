import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useMotion, type MotionPref } from "@/lib/motion";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { lang } = useI18n();
  const { pref, setPref, reduced } = useMotion();
  const ar = lang === "ar";

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
