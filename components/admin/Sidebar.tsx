"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Control Panel", icon: LayoutDashboard },
  { href: "/admin/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/admin/dashboard/leads", label: "Leads", icon: Users },
  { href: "/admin/dashboard/users", label: "Users", icon: UserCheck },
  { href: "/admin/dashboard/settings", label: "Configuration Settings", icon: Settings },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  function isActive(href: string): boolean {
    return href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div>
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
          <span className="text-lg font-bold tracking-tight text-[var(--color-ink)]">Chronos Admin</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-bone)] text-[var(--color-ink)]"
                    : "text-[var(--color-ink-secondary)] hover:bg-[var(--color-bone)] hover:text-[var(--color-ink)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-[var(--color-border)] p-4">
        <p className="truncate px-3 pb-1 text-xs text-[var(--color-ink-secondary)]">{userEmail}</p>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-bone)] hover:text-[var(--color-ink)]"
        >
          <ExternalLink className="h-4 w-4" />
          Volver al sitio
        </Link>
        <button
          onClick={() => {
            setSignOutError(null);
            signOut(getFirebaseAuth()).catch(() => setSignOutError("Could not sign out. Try again."));
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-accent-red-text)] transition-colors hover:bg-[var(--color-accent-red-bg)]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        {signOutError && <p className="px-3 text-xs text-[var(--color-accent-red-text)]">{signOutError}</p>}
      </div>
    </aside>
  );
}
