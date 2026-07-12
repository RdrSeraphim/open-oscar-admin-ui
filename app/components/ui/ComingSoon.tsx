import { PageHeader } from "./PageHeader";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm font-semibold text-foreground/70">Coming soon</p>
        <p className="mt-1 text-sm text-foreground/50">{description}</p>
      </div>
    </div>
  );
}
