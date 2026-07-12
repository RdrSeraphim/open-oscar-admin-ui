import { ReactNode } from "react";

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-t-md bg-gradient-to-r from-aim-blue to-aim-blue-light px-4 py-3 shadow-sm">
      <h1 className="text-base font-bold text-white">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
