import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bone)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-12 text-sm text-[var(--color-ink-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-bold text-[var(--color-ink)]">Chronos</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <p>&copy; {new Date().getFullYear()} Chronos Real Estate. All rights reserved.</p>
          <Link href="/admin/login" className="transition-colors hover:text-[var(--color-ink)]">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
