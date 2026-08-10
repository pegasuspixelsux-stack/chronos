"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PropertyForm from "@/components/admin/PropertyForm";
import { deleteProperty, subscribeToProperties, updateProperty } from "@/lib/properties";
import { countSliderSlots, formatPrice, removedImageUrls } from "@/lib/property-utils";
import { deleteImages } from "@/lib/storage";
import { PROPERTY_TYPE_LABELS, type Property, type PropertyInput } from "@/lib/types";

export default function PropertiesDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToProperties(
      (next) => {
        setProperties(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("No se pudieron cargar las propiedades. Verificá tu conexión e intentá de nuevo.");
      }
    );
    return () => unsubscribe();
  }, []);

  const editingProperty = properties.find((property) => property.id === editingId) ?? null;
  const sliderCount = countSliderSlots(properties, editingId ?? undefined);

  async function handleUpdate(values: PropertyInput) {
    if (!editingId || !editingProperty) return;
    const removedUrls = removedImageUrls(editingProperty.imageUrls, values.imageUrls);
    await updateProperty(editingId, values);
    setEditingId(null);
    if (removedUrls.length > 0) {
      deleteImages(removedUrls).catch(() => {
        // Best-effort cleanup; the Firestore update already succeeded.
      });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar esta propiedad? Esta acción no se puede deshacer.")) return;
    const property = properties.find((p) => p.id === id);
    try {
      await deleteProperty(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No se pudo eliminar la propiedad. Intentá de nuevo.");
      return;
    }
    if (property && property.imageUrls.length > 0) {
      deleteImages(property.imageUrls).catch(() => {
        // Best-effort cleanup; the Firestore delete already succeeded.
      });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Propiedades</h1>
        <Link
          href="/admin/dashboard/properties/new"
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Agregar propiedad
        </Link>
      </div>

      {editingProperty && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
            Editar {editingProperty.title}
          </h2>
          <div className="mt-4">
            <PropertyForm
              key={editingProperty.id}
              initialValues={{
                title: editingProperty.title,
                description: editingProperty.description,
                price: editingProperty.price,
                propertyType: editingProperty.propertyType,
                location: editingProperty.location,
                bedrooms: editingProperty.bedrooms,
                bathrooms: editingProperty.bathrooms,
                areaSqm: editingProperty.areaSqm,
                imageUrls: editingProperty.imageUrls,
                featured: editingProperty.featured,
                inHeroSlider: editingProperty.inHeroSlider,
              }}
              submitLabel="Guardar cambios"
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
              sliderCount={sliderCount}
            />
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Cargando propiedades…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : properties.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">
            Todavía no hay propiedades. Agregá tu primera publicación.
          </p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Título</th>
                <th className="py-3 pr-4 font-medium">Tipo</th>
                <th className="py-3 pr-4 font-medium">Precio</th>
                <th className="py-3 pr-4 font-medium">Destacada</th>
                <th className="py-3 pr-4 font-medium">Carrusel</th>
                <th className="py-3 pr-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-b border-[var(--color-border)] text-[var(--color-ink)]">
                  <td className="py-3 pr-4">{property.title}</td>
                  <td className="py-3 pr-4">{PROPERTY_TYPE_LABELS[property.propertyType]}</td>
                  <td className="py-3 pr-4">{formatPrice(property.price)}</td>
                  <td className="py-3 pr-4">{property.featured ? "Sí" : "No"}</td>
                  <td className="py-3 pr-4">{property.inHeroSlider ? "Sí" : "No"}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => setEditingId(property.id)}
                      className="mr-3 text-[var(--color-accent-teal)] hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(property.id)}
                      className="text-[var(--color-accent-red-text)] hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
