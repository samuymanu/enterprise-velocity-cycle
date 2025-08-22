import React from "react";
import { Outlet, NavLink } from "react-router-dom";

const inventoryNav = [
  { label: "Productos", to: "/inventory" },
  { label: "Categorías", to: "/inventory/categories" },
  { label: "Marcas", to: "/inventory/brands" },
  { label: "Atributos", to: "/inventory/attributes" },
];

export default function InventoryLayout() {
  return (
    <main className="flex-1 p-6 overflow-auto">
      <Outlet />
    </main>
  );
}
