import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-foreground hover:bg-muted" />
        
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            BikeShop ERP
          </h1>
          <Badge variant="secondary" className="text-xs">
            Enterprise
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            💰 Nueva Venta
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            👥 Nuevo Cliente
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            📦 Nuevo Producto
          </Button>
        </div>

        {/* System Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse-subtle"></div>
            <span className="text-xs text-foreground-secondary hidden sm:inline">
              Sistema Operativo
            </span>
          </div>
        </div>

        {/* User Menu */}
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            A
          </div>
          <span className="hidden sm:inline text-sm">Admin</span>
        </Button>
      </div>
    </header>
  );
}