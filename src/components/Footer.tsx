import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { tr } = useI18n();
  return (
    <footer className="mt-20 py-10 border-t border-border/60">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <div className="font-display text-lg font-extrabold text-primary mb-1">{tr("brand")}</div>
        <div>{tr("footer")}</div>
      </div>
    </footer>
  );
}
