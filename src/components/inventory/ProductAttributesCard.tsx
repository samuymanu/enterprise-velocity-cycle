import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Attribute {
  attributeId: string;
  name: string;
  type: string;
  value: any;
  unit?: string;
  helpText?: string;
  isGlobal?: boolean;
  dependsOn?: string;
  minValue?: number | null;
  maxValue?: number | null;
  regex?: string;
}

interface ProductAttributesCardProps {
  attributes: Attribute[];
}

export const ProductAttributesCard: React.FC<ProductAttributesCardProps> = ({ attributes }) => {
  if (!attributes || attributes.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader>Atributos del producto</CardHeader>
        <CardContent>
          <span className="text-muted-foreground text-sm">Este producto no tiene atributos configurados.</span>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="mb-4">
      <CardHeader>Atributos del producto</CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {attributes.map(attr => (
            <div key={attr.attributeId} className="flex flex-col mb-2 border rounded p-2 bg-background/50">
              <span className="font-medium text-sm flex items-center gap-2">
                {attr.name}
                {attr.unit && <span className="text-xs text-muted-foreground">({attr.unit})</span>}
                {attr.isGlobal && <span className="text-xs bg-primary/10 px-2 py-1 rounded">Global</span>}
              </span>
              {attr.helpText && <span className="text-xs text-muted-foreground mb-1">{attr.helpText}</span>}
              {attr.dependsOn && <span className="text-xs text-warning mb-1">Depende de: {attr.dependsOn}</span>}
              {attr.type === 'BOOLEAN' && (
                <Badge variant={attr.value ? 'secondary' : 'destructive'} className="ml-2">
                  {attr.value ? 'Sí' : 'No'}
                </Badge>
              )}
              {attr.type === 'STRING' || attr.type === 'NUMBER' || attr.type === 'DATE' ? (
                <span className="text-xs text-muted-foreground">{attr.value || '-'}</span>
              ) : null}
              {attr.type === 'LIST' && (
                <Badge variant="secondary" className="mt-1">{attr.value || '-'}</Badge>
              )}
              {/* Mostrar reglas avanzadas */}
              {attr.type === 'NUMBER' && (attr.minValue !== null || attr.maxValue !== null) && (
                <span className="text-xs text-muted-foreground mt-1">
                  {attr.minValue !== null && `Mín: ${attr.minValue} `}
                  {attr.maxValue !== null && `Máx: ${attr.maxValue}`}
                </span>
              )}
              {attr.type === 'STRING' && attr.regex && (
                <span className="text-xs text-muted-foreground mt-1">Regex: {attr.regex}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
