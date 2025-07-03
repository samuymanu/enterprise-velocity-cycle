import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

// Icons for navigation - using only allowed lucide-react icons
const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: "📊",
    description: "Vista general del negocio"
  },
  {
    title: "Punto de Venta",
    url: "/pos",
    icon: "🛒",
    description: "Sistema de ventas"
  },
  {
    title: "Inventario",
    url: "/inventory",
    icon: "📦",
    description: "Gestión de productos"
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: "👥",
    description: "Base de datos de clientes"
  },
  {
    title: "Ventas",
    url: "/sales",
    icon: "💰",
    description: "Historial y reportes"
  },
  {
    title: "Taller",
    url: "/workshop",
    icon: "🔧",
    description: "Órdenes de servicio"
  },
  {
    title: "Reportes",
    url: "/reports",
    icon: "📈",
    description: "Analytics y métricas"
  },
  {
    title: "Configuración",
    url: "/settings",
    icon: "⚙️",
    description: "Administración del sistema"
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string) => {
    const baseClasses = "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 text-sm font-medium";
    
    if (isActive(path)) {
      return `${baseClasses} bg-sidebar-accent text-sidebar-primary-foreground border border-sidebar-ring/20`;
    }
    
    return `${baseClasses} text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`;
  };

  return (
    <Sidebar className={`border-r border-sidebar-border ${isCollapsed ? "w-16" : "w-64"}`} collapsible="icon">
      <SidebarContent className="bg-sidebar">
        {/* Company Logo/Brand */}
        <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
            🚲
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">BikeShop ERP</span>
              <span className="text-xs text-sidebar-foreground/70">Enterprise Edition</span>
            </div>
          )}
        </div>

        <SidebarGroup className="px-3 py-2">
          <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
            {!isCollapsed ? "Módulos Principales" : ""}
          </SidebarGroupLabel>
          
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto p-0">
                    <NavLink 
                      to={item.url} 
                      className={getNavClasses(item.url)}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{item.title}</span>
                          <span className="text-xs text-sidebar-foreground/60 truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Section */}
        <div className="mt-auto border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              A
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-sidebar-foreground truncate">
                  Admin User
                </span>
                <span className="text-xs text-sidebar-foreground/60">
                  Administrador
                </span>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}