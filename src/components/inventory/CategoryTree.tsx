import React, { useState, useEffect } from "react";
import { apiService } from "../../lib/api";
import { CategoryAttributesModal } from "./CategoryAttributesModal";

// Definición extendida para soportar todos los campos del modelo
interface Category {
  id: string;
  name: string;
  description?: string;
  code: string;
  isActive: boolean;
  parentId?: string;
  level: number;
  path?: string;
  children: Category[];
  _count?: {
    products: number;
    categoryAttributes: number;
  };
}

function CategoryNode({ category, onEdit, onAdd, onDelete, onAttributes }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="ml-4 mt-1">
      <div className="flex items-center gap-2">
        {category.children.length > 0 && (
          <button onClick={() => setExpanded((e) => !e)} className="text-xs">
            {expanded ? "▼" : "▶"}
          </button>
        )}
        <span className="font-medium">{category.name}</span>
        <span className="text-xs bg-blue-100 text-blue-800 rounded px-1 font-mono">{category.code}</span>
        {!category.isActive && (
          <span className="text-xs bg-red-100 text-red-800 rounded px-1 ml-1">Inactivo</span>
        )}
        <button onClick={() => onEdit(category)} className="text-blue-600 text-xs">Editar</button>
        <button onClick={() => onAdd(category)} className="text-green-600 text-xs">Agregar</button>
        <button onClick={() => onDelete(category)} className="text-red-600 text-xs">Eliminar</button>
        <button onClick={() => onAttributes(category)} className="text-purple-600 text-xs">Atributos</button>
        {category._count && (
          <span className="text-xs text-gray-500 ml-2">{category._count.products} prod / {category._count.categoryAttributes} attr</span>
        )}
      </div>
      {expanded && category.children.length > 0 && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              onEdit={onEdit}
              onAdd={onAdd}
              onDelete={onDelete}
              onAttributes={onAttributes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Utilidad para transformar array plano a árbol
function buildCategoryTree(flatCategories) {
  const map = {};
  const roots = [];
  flatCategories.forEach(cat => {
    map[cat.id] = { ...cat, children: [] };
  });
  flatCategories.forEach(cat => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  });
  return roots;
}

export default function CategoryTree() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("create"); // "create" | "edit" | "add-sub"
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", code: "", isActive: true });
  const [showAttrModal, setShowAttrModal] = useState(false);
  const [attrCategory, setAttrCategory] = useState(null);

  // Cargar categorías reales desde la API
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiService.categories.getAll();
      const flat = res.categories || [];
      setCategories(buildCategoryTree(flat));
    } catch (e) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setModalType("create");
    setForm({ name: "", description: "", code: "", isActive: true });
    setSelectedCategory(null);
    setShowModal(true);
  };
  const openEditModal = (cat) => {
    setModalType("edit");
    setForm({
      name: cat.name,
      description: cat.description || "",
      code: cat.code || "",
      isActive: cat.isActive !== undefined ? cat.isActive : true
    });
    setSelectedCategory(cat);
    setShowModal(true);
  };
  const openAddSubModal = (cat) => {
    setModalType("add-sub");
    setForm({ name: "", description: "", code: "", isActive: true });
    setSelectedCategory(cat);
    setShowModal(true);
  };
  const openAttrModal = (cat) => {
    setAttrCategory(cat);
    setShowAttrModal(true);
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    try {
      await apiService.categories.delete(cat.id);
      fetchCategories();
    } catch (e) {
      alert("Error al eliminar categoría");
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      // Siempre enviar description como string
      let payload: any = {
        name: form.name,
        description: form.description || "",
        code: form.code || (form.name
          .normalize("NFD")
          .replace(/([\u0300-\u036f]|[^a-zA-Z])/g, "")
          .toUpperCase()
          .slice(0, 3)),
        isActive: form.isActive !== undefined ? form.isActive : true
      };
      if (modalType === "create") {
        await apiService.categories.create(payload);
      } else if (modalType === "edit" && selectedCategory) {
        // Aquí deberías tener un endpoint update real
        await apiService.categories.create({ ...payload, id: selectedCategory.id });
      } else if (modalType === "add-sub" && selectedCategory) {
        // Calcular level y path
        const parent = selectedCategory;
        const subLevel = (parent.level || 0) + 1;
        const subPath = parent.path ? `${parent.path}/${form.name}` : form.name;
        const subPayload = {
          ...payload,
          parentId: parent.id,
          level: subLevel,
          path: subPath
        };
        await apiService.categories.createSubcategory(subPayload);
      }
      setShowModal(false);
      fetchCategories();
    } catch (e) {
      alert("Error al guardar categoría");
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Árbol de Categorías</h2>
      <button className="mb-2 px-2 py-1 bg-green-600 text-white rounded" onClick={openCreateModal}>Nueva categoría</button>
      {loading ? (
        <div className="text-sm text-gray-500">Cargando...</div>
      ) : (
        <div>
          {categories.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              onEdit={openEditModal}
              onAdd={openAddSubModal}
              onDelete={handleDelete}
              onAttributes={openAttrModal}
            />
          ))}
        </div>
      )}

      {/* Modal simple para crear/editar categoría/subcategoría */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">
              {modalType === "create" && "Nueva categoría"}
              {modalType === "edit" && `Editar: ${form.name}`}
              {modalType === "add-sub" && `Agregar subcategoría a: ${selectedCategory?.name}`}
            </h3>
            <form onSubmit={handleModalSubmit} className="space-y-2">
              <input
                className="border px-2 py-1 w-full"
                name="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre"
                required
              />
              <input
                className="border px-2 py-1 w-full"
                name="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción (opcional)"
              />
              <input
                className="border px-2 py-1 w-full"
                name="code"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().slice(0, 3) }))}
                placeholder="Código (3 letras)"
                maxLength={3}
                required
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                Activa
              </label>
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" className="px-2 py-1" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de atributos de categoría */}
      {showAttrModal && attrCategory && (
        <CategoryAttributesModal
          isOpen={showAttrModal}
          onClose={() => setShowAttrModal(false)}
          category={attrCategory}
        />
      )}
    </div>
  );
}
