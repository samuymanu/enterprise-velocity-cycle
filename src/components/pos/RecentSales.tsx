import { Card } from "@/components/ui/card";

export function RecentSales() {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Ventas del Día</h3>
      <div className="text-center text-muted-foreground py-4">
        <p>📊 No hay ventas registradas hoy</p>
      </div>
    </Card>
  );
}
