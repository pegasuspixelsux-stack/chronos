"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PropertyForm from "@/components/admin/PropertyForm";
import { countSliderSlots, deleteProperty, formatPrice, subscribeToProperties, updateProperty } from "@/lib/properties";
import type { Property, PropertyInput } from "@/lib/types";

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
        setError("Could not load properties. Check your connection and try again.");
      }
    );
    return () => unsubscribe();
  }, []);

  const editingProperty = properties.find((property) => property.id === editingId) ?? null;
  const sliderCount = countSliderSlots(properties, editingId ?? undefined);

  async function handleUpdate(values: PropertyInput) {
    if (!editingId) return;
    await updateProperty(editingId, values);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this property? This cannot be undone.")) return;
    try {
      await deleteProperty(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete this property. Try again.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Properties</h1>
        <Link
          href="/admin/dashboard/properties/new"
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Add new property
        </Link>
      </div>

      {editingProperty && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-ink)]">Edit {editingProperty.title}</h2>
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
                imageUrl: editingProperty.imageUrl,
                featured: editingProperty.featured,
                inHeroSlider: editingProperty.inHeroSlider,
              }}
              submitLabel="Save changes"
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
              sliderCount={sliderCount}
            />
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading properties…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : properties.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">No properties yet. Add your first listing.</p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Title</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Price</th>
                <th className="py-3 pr-4 font-medium">Featured</th>
                <th className="py-3 pr-4 font-medium">Slider</th>
                <th className="py-3 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-b border-[var(--color-border)] text-[var(--color-ink)]">
                  <td className="py-3 pr-4">{property.title}</td>
                  <td className="py-3 pr-4">{property.propertyType}</td>
                  <td className="py-3 pr-4">{formatPrice(property.price)}</td>
                  <td className="py-3 pr-4">{property.featured ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4">{property.inHeroSlider ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => setEditingId(property.id)}
                      className="mr-3 text-[var(--color-accent-teal)] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(property.id)}
                      className="text-[var(--color-accent-red-text)] hover:underline"
                    >
                      Delete
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
