import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";
import { ManageCategoriesModal } from "@/components/inventory/ManageCategoriesModal";
import { AppLayout } from "@/components/layout/AppLayout";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    const data = await apiService.categories.getAll();
    // Si la respuesta es un objeto con .categories, usar esa propiedad
    if (Array.isArray(data)) {
      setCategories(data);
    } else if (data && Array.isArray(data.categories)) {
      setCategories(data.categories);
    } else {
      setCategories([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Categorías</h1>
          <Button onClick={() => setModalOpen(true)}>Gestionar categorías</Button>
        </div>
        <Card className="p-4">
          {loading ? (
            <div>Cargando...</div>
          ) : categories.length === 0 ? (
            <div>No hay categorías registradas.</div>
          ) : (
            <div className="space-y-6">
              {/* Mostrar solo categorías principales */}
              {categories.filter(cat => !cat.parentId).map((cat) => (
                <div key={cat.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-lg">{cat.name}</span>
                      {cat.description && <span className="ml-2 text-gray-500 text-sm">{cat.description}</span>}
                    </div>
                  </div>
                  {/* Subcategorías */}
                  <ul className="ml-4 mt-2 space-y-1">
                    {categories.filter(sub => sub.parentId === cat.id).map(sub => (
                      <li key={sub.id} className="bg-white rounded px-3 py-1 border text-sm flex items-center justify-between">
                        <span>{sub.name}</span>
                        {sub.description && <span className="ml-2 text-gray-400">{sub.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
        <ManageCategoriesModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onDataChange={loadCategories} />
      </div>
    </AppLayout>
  );
}
