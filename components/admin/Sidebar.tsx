"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  UserCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Panel de Control", icon: LayoutDashboard },
  { href: "/admin/dashboard/properties", label: "Propiedades", icon: Building2 },
  { href: "/admin/dashboard/leads", label: "Leads", icon: Users },
  { href: "/admin/dashboard/curated-leads", label: "Leads Curados", icon: Sparkles },
  { href: "/admin/dashboard/advisor-requests", label: "Solicitudes de Asesor", icon: MessageSquare },
  { href: "/admin/dashboard/salespeople", label: "Asesores", icon: UsersRound },
  { href: "/admin/dashboard/users", label: "Usuarios", icon: UserCheck },
  { href: "/admin/dashboard/settings", label: "Configuración", icon: Settings },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function isActive(href: string): boolean {
    return href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:hidden">
        <span className="text-lg font-bold tracking-tight text-[var(--color-ink)]">Chronos Admin</span>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="admin-mobile-sidebar"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex h-9 w-9 items-center justify-center text-[var(--color-ink)]"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        id="admin-mobile-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : ""
        }`}
      >
        <div>
          <div className="hidden h-16 items-center border-b border-[var(--color-border)] px-6 lg:flex">
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
                  onClick={() => setIsOpen(false)}
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
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-bone)] hover:text-[var(--color-ink)]"
          >
            <ExternalLink className="h-4 w-4" />
            Volver al sitio
          </Link>
          <button
            onClick={() => {
              setSignOutError(null);
              signOut(getFirebaseAuth()).catch(() => setSignOutError("No se pudo cerrar sesión. Intentá de nuevo."));
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-accent-red-text)] transition-colors hover:bg-[var(--color-accent-red-bg)]"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          {signOutError && <p className="px-3 text-xs text-[var(--color-accent-red-text)]">{signOutError}</p>}
        </div>
      </aside>
    </>
  );
}
