import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const salesData = [
  { name: "Ene", ventas: 12400, servicios: 3200 },
  { name: "Feb", ventas: 15600, servicios: 4100 },
  { name: "Mar", ventas: 18900, servicios: 4800 },
  { name: "Abr", ventas: 16200, servicios: 4200 },
  { name: "May", ventas: 21100, servicios: 5500 },
  { name: "Jun", ventas: 19800, servicios: 5200 },
  { name: "Jul", ventas: 24500, servicios: 6100 }
];

export function SalesChart() {
  return (
    <Card className="enterprise-card">
      <div className="p-6 border-b border-card-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Tendencia de Ventas</h3>
            <p className="text-sm text-foreground-secondary">Ventas y servicios por mes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary"></div>
              <span className="text-sm text-foreground-secondary">Ventas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-accent"></div>
              <span className="text-sm text-foreground-secondary">Servicios</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground-secondary))", fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground-secondary))", fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`, 
                  name === "ventas" ? "Ventas" : "Servicios"
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="ventas" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
              <Line 
                type="monotone" 
                dataKey="servicios" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--accent))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-card-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">$156.8k</p>
            <p className="text-sm text-foreground-secondary">Total Ventas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">$33.2k</p>
            <p className="text-sm text-foreground-secondary">Total Servicios</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-success">+18.5%</span>
              <Badge className="status-badge status-success">📈</Badge>
            </div>
            <p className="text-sm text-foreground-secondary">Crecimiento</p>
          </div>
        </div>
      </div>
    </Card>
  );
}