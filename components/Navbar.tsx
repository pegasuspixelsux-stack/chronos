"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/#about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={`z-50 border-b border-[var(--color-border)] bg-[var(--color-bone)]/50 backdrop-blur-sm ${
        isHome ? "fixed top-0 right-0 left-0" : "sticky top-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          Chronos
        </Link>
        <nav className="hidden gap-8 text-sm text-white/80 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/properties"
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Browse listings
        </Link>
      </div>
    </header>
  );
}
