"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/#about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className={`z-50 border-b border-[var(--color-border)] bg-[var(--color-bone)]/50 backdrop-blur-sm ${
        isHome ? "fixed top-0 right-0 left-0" : "sticky top-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-black">
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
          className="hidden rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] sm:inline-flex"
        >
          Browse listings
        </Link>
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="flex h-9 w-9 items-center justify-center text-white sm:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            {isMenuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>
      {isMenuOpen && (
        <nav
          id="mobile-nav-menu"
          className="flex flex-col gap-1 border-t border-[var(--color-border)] bg-[var(--color-bone)] px-6 py-4 sm:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-[var(--color-ink)] transition-colors hover:bg-black/5"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/properties"
            onClick={() => setIsMenuOpen(false)}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
          >
            Browse listings
          </Link>
        </nav>
      )}
    </header>
  );
}
