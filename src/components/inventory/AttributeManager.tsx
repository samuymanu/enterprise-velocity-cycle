
import React, { useState, useEffect } from "react";
import { apiService } from "../../lib/api";

// Toast simple (sin dependencia externa)
function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow text-white ${type === "success" ? "bg-green-600" : "bg-red-600"}`}
      onClick={onClose}
      style={{ cursor: "pointer" }}>
      {message}
    </div>
  );
}

// Tipado extendido

type AttributeType = "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "LIST";
interface Attribute {
  id: string;
  name: string;
  description?: string;
  type: AttributeType;
  isRequired: boolean;
  isGlobal: boolean;
  options: string[];
  unit?: string;
  minValue?: number;
  maxValue?: number;
}


export default function AttributeManager() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "STRING" as AttributeType,
    isRequired: false,
    isGlobal: false,
    options: [] as string[],
    unit: "",
    minValue: "",
    maxValue: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [formError, setFormError] = useState("");
  const [newOption, setNewOption] = useState("");

  // Cargar atributos desde la API
  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const res = await apiService.attributes.getAllAttributes();
      // API returns array or { attributes: [] } depending on endpoint; normalize
      const attrs = Array.isArray(res) ? res : (res?.attributes || []);
      setAttributes(attrs);
    } catch (e) {
      setAttributes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "STRING",
      isRequired: false,
      isGlobal: false,
      options: [],
      unit: "",
      minValue: "",
      maxValue: ""
    });
    setNewOption("");
  };

  const handleStartEdit = (attribute: Attribute) => {
    setFormData({
      name: attribute.name,
      description: attribute.description || "",
      type: attribute.type,
      isRequired: attribute.isRequired,
      isGlobal: attribute.isGlobal,
      options: [...attribute.options],
      unit: attribute.unit || "",
      minValue: attribute.minValue?.toString() || "",
      maxValue: attribute.maxValue?.toString() || ""
    });
    setEditingId(attribute.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleSave = async () => {
    setFormError("");
    if (!formData.name.trim()) {
      setFormError("El nombre es requerido");
      return;
    }
    if (formData.type === "LIST" && formData.options.length === 0) {
      setFormError("Los atributos tipo lista deben tener al menos una opción");
      return;
    }
    // Construir payload
    const attributeData: any = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      type: formData.type,
      isRequired: formData.isRequired,
      isGlobal: formData.isGlobal,
      options: formData.type === "LIST" ? formData.options : [],
      unit: formData.unit.trim() || undefined,
      minValue: formData.minValue ? parseFloat(formData.minValue) : undefined,
      maxValue: formData.maxValue ? parseFloat(formData.maxValue) : undefined
    };
    try {
      if (editingId) {
        await apiService.attributes.update(editingId, attributeData);
        setToast({ message: "Atributo editado correctamente", type: "success" });
      } else {
        await apiService.attributes.create(attributeData);
        setToast({ message: "Atributo creado correctamente", type: "success" });
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchAttributes();
    } catch (err) {
      setToast({ message: "Error al guardar atributo", type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este atributo?")) return;
    try {
  await apiService.attributes.delete(id);
      setToast({ message: "Atributo eliminado", type: "success" });
      fetchAttributes();
    } catch (err) {
      setToast({ message: "Error al eliminar atributo", type: "error" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let checked = false;
    if (type === "checkbox" && "checked" in e.target) {
      checked = (e.target as HTMLInputElement).checked;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      options: value.split(/\n|,/).map(opt => opt.trim()).filter(Boolean)
    }));
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Gestor de Atributos</h2>
      <button
        className="mb-2 px-2 py-1 bg-blue-600 text-white rounded"
        onClick={() => {
          setShowForm((v) => !v);
          setEditingId(null);
          setFormData({
            name: "",
            description: "",
            type: "STRING",
            isRequired: false,
            isGlobal: false,
            options: [],
            unit: "",
            minValue: "",
            maxValue: ""
          });
        }}
      >
        {showForm ? "Cancelar" : "Nuevo atributo"}
      </button>
      {showForm && (
        <form className="mb-4 p-2 border rounded" onSubmit={handleSubmit}>
          <input
            className="border px-2 py-1 mr-2"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Nombre del atributo"
            required
          />
          <select name="type" value={formData.type} onChange={handleInputChange} className="border px-2 py-1 mr-2">
            <option value="STRING">Texto</option>
            <option value="NUMBER">Número</option>
            <option value="BOOLEAN">Sí/No</option>
            <option value="DATE">Fecha</option>
            <option value="LIST">Lista</option>
          </select>
          {formData.type === "LIST" && (
            <textarea
              className="border px-2 py-1 mr-2 align-top"
              name="options"
              value={formData.options.join("\n")}
              onChange={handleOptionsChange}
              placeholder="Opciones (una por línea o separadas por coma)"
              rows={3}
              style={{ minWidth: 180 }}
              required
            />
          )}
          <input
            className="border px-2 py-1 mr-2"
            name="unit"
            value={formData.unit}
            onChange={handleInputChange}
            placeholder="Unidad (opcional)"
          />
          <label className="mr-2">
            <input type="checkbox" name="isRequired" checked={formData.isRequired} onChange={handleInputChange} /> Requerido
          </label>
          <button type="submit" className="bg-green-600 text-white px-2 py-1 rounded">Guardar</button>
          {formError && <div className="text-red-600 text-xs mt-2">{formError}</div>}
        </form>
      )}
      {loading ? (
        <div className="text-sm text-gray-500">Cargando...</div>
      ) : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Unidad</th>
              <th className="p-2 border">Requerido</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {attributes.map((attr) => (
              <tr key={attr.id}>
                <td className="p-2 border">{attr.name}</td>
                <td className="p-2 border">{attr.type}
                  {attr.type === "LIST" && Array.isArray(attr.options) && (
                    <div className="text-xs text-gray-500 mt-1">[
                      {attr.options.join(", ")}
                    ]</div>
                  )}
                </td>
                <td className="p-2 border">{attr.unit || "-"}</td>
                <td className="p-2 border">{attr.isRequired ? "Sí" : "No"}</td>
                <td className="p-2 border">
                  <button className="text-blue-600 text-xs mr-2" onClick={() => handleStartEdit(attr)}>Editar</button>
                  <button className="text-red-600 text-xs" onClick={() => handleDelete(attr.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
    </div>
  );
}
