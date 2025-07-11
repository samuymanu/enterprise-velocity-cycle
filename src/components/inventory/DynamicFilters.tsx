import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";

interface Attribute {
  attributeId: string;
  name: string;
  type: string;
  isRequired: boolean;
  values: string[];
}

interface DynamicFiltersProps {
  categoryId: string | null;
  onFilterChange: (filters: Record<string, string>) => void;
}

export function DynamicFilters({ categoryId, onFilterChange }: DynamicFiltersProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      setFilters({});
      return;
    }
    setLoading(true);
    apiService.products.getAttributesByCategory(categoryId)
      .then((data) => {
        setAttributes(data.attributes || []);
        setFilters({});
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  if (!categoryId || attributes.length === 0) return null;

  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap gap-4 items-end">
        {attributes.map(attr => (
          <div key={attr.attributeId} className="flex flex-col min-w-[180px]">
            <label className="mb-1 font-medium text-sm">{attr.name}</label>
            <Select
              value={filters[`attribute_${attr.attributeId}`] || ""}
              onValueChange={val => setFilters(f => ({ ...f, [`attribute_${attr.attributeId}`]: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Filtrar por ${attr.name}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {attr.values.map(val => (
                  <SelectItem key={val} value={val}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {loading && <span className="text-xs text-muted-foreground">Cargando filtros...</span>}
      </div>
    </Card>
  );
}
