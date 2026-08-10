"use client";

import { useEffect, useState, type FormEvent } from "react";
import LogoUpload from "@/components/admin/LogoUpload";
import { getSiteSettings, updateSiteSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/types";

const EMPTY_SETTINGS: SiteSettings = {
  logoUrl: "",
  businessName: "",
  address: "",
  phone: "",
  whatsappNumber: "",
  contactEmail: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then((result) => {
        if (cancelled) return;
        if (result) setSettings(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("No se pudo cargar la configuración. Verificá tu conexión e intentá de nuevo.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await updateSiteSettings(settings);
      setSaved(true);
    } catch {
      setSaveError("No se pudo guardar la configuración. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-secondary)]">Cargando…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-[var(--color-accent-red-text)]">{loadError}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Configuración</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex max-w-lg flex-col gap-4">
        <LogoUpload value={settings.logoUrl} onChange={(url) => update("logoUrl", url)} />

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Nombre del negocio
          <input
            value={settings.businessName}
            onChange={(event) => update("businessName", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Dirección
          <input
            value={settings.address}
            onChange={(event) => update("address", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Teléfono
          <input
            value={settings.phone}
            onChange={(event) => update("phone", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Número de WhatsApp
          <input
            value={settings.whatsappNumber}
            onChange={(event) => update("whatsappNumber", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Correo de contacto
          <input
            type="email"
            value={settings.contactEmail}
            onChange={(event) => update("contactEmail", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        {saveError && <p className="text-sm text-[var(--color-accent-red-text)]">{saveError}</p>}
        {saved && <p className="text-sm text-[var(--color-accent-teal)]">Configuración guardada.</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </form>
    </div>
  );
}
