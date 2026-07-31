import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { SiteSettingsProvider } from "@/lib/site-settings";
import { MotionProvider } from "@/lib/motion";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-black text-primary">404</h1>
        <p className="mt-4 text-muted-foreground">الصفحة غير موجودة</p>
        <a href="/" className="mt-6 inline-block bubble-btn text-white" style={{ background: "var(--gradient-primary)" }}>الرئيسية</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "مِرحابو — التعلّم بقى لعبة!" },
      { name: "description", content: "منصة ألعاب تعليمية تفاعلية للأطفال من 4 إلى 12 سنة. اختر قالب، أضف محتواك، شارك مع طلابك." },
      { property: "og:title", content: "مِرحابو — التعلّم بقى لعبة!" },
      { property: "og:description", content: "منصة ألعاب تعليمية تفاعلية للأطفال من 4 إلى 12 سنة. اختر قالب، أضف محتواك، شارك مع طلابك." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "مِرحابو — التعلّم بقى لعبة!" },
      { name: "twitter:description", content: "منصة ألعاب تعليمية تفاعلية للأطفال من 4 إلى 12 سنة. اختر قالب، أضف محتواك، شارك مع طلابك." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/534ced98-06ae-4340-80ee-a2a9d95a3eca/id-preview-8d66dfe4--870a3bed-844c-48d7-a718-2f70f0704bd5.lovable.app-1777832074346.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/534ced98-06ae-4340-80ee-a2a9d95a3eca/id-preview-8d66dfe4--870a3bed-844c-48d7-a718-2f70f0704bd5.lovable.app-1777832074346.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@600;700;800;900&family=Nunito:wght@400;700;800;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <SiteSettingsProvider>
        <I18nProvider>
          <MotionProvider>
            <Outlet />
            <Toaster position="top-center" richColors />
          </MotionProvider>
        </I18nProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  );
}
