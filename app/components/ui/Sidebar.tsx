"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/users", label: "Users" },
  { href: "/sessions", label: "Sessions" },
  { href: "/feedbag", label: "Buddy Lists" },
  { href: "/chat-rooms", label: "Chat Rooms" },
  { href: "/instant-message", label: "Instant Message" },
  { href: "/directory", label: "Directory" },
  { href: "/bart", label: "BART Assets" },
  { href: "/api-keys", label: "Web API Keys" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-full flex-col border-r border-border bg-surface">
      <div className="bg-gradient-to-r from-aim-blue-dark to-aim-blue px-4 py-5">
        <p className="text-lg font-extrabold tracking-tight text-aim-gold">
          aimctl
        </p>
        <p className="text-xs text-white/70">open-oscar-server admin</p>
      </div>
      <ul className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-aim-gold text-aim-blue-dark"
                    : "text-foreground/80 hover:bg-border/40"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
