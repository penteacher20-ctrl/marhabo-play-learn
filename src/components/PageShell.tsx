import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-black text-center">{title}</h1>
          {subtitle && <p className="mt-3 text-center text-muted-foreground text-lg">{subtitle}</p>}
          <div className="card-pop p-6 md:p-8 mt-8 space-y-5 leading-relaxed text-foreground/80">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function Sec({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-display font-extrabold text-foreground mb-2">{h}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
