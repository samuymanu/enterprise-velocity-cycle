import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, XCircle, Calendar, CircleDot, ListOrdered, 
  TextIcon, Hash, Globe, Star, Pencil 
} from 'lucide-react';

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
  // Group attributes by type for better organization
  const groupedAttributes = {
    all: attributes,
    technical: attributes.filter(attr => !attr.isGlobal),
    global: attributes.filter(attr => attr.isGlobal)
  };

  if (!attributes || attributes.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Atributos del producto</h3>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex items-center justify-center p-4 border border-dashed rounded-md">
            <span className="text-muted-foreground text-sm">Este producto no tiene atributos configurados.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get icon for attribute type
  const getAttributeIcon = (type: string) => {
    switch (type) {
      case 'STRING': return <TextIcon className="h-3.5 w-3.5" />;
      case 'NUMBER': return <Hash className="h-3.5 w-3.5" />;
      case 'BOOLEAN': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'LIST': return <ListOrdered className="h-3.5 w-3.5" />;
      case 'DATE': return <Calendar className="h-3.5 w-3.5" />;
      default: return <CircleDot className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Atributos del producto</h3>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {attributes.length} atributos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all" className="text-xs">Todos ({attributes.length})</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">
              Técnicos ({groupedAttributes.technical.length})
            </TabsTrigger>
            <TabsTrigger value="global" className="text-xs">
              Globales ({groupedAttributes.global.length})
            </TabsTrigger>
          </TabsList>
          
          {Object.entries(groupedAttributes).map(([tab, attrs]) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              {attrs.length === 0 ? (
                <div className="flex items-center justify-center p-4 border border-dashed rounded-md">
                  <span className="text-muted-foreground text-xs">No hay atributos {tab === 'global' ? 'globales' : 'técnicos'}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attrs.map(attr => (
                    <div 
                      key={attr.attributeId} 
                      className={`
                        flex items-start p-3 rounded-lg border
                        ${attr.isGlobal ? 'bg-primary/5 border-primary/20' : 'bg-background/50'}
                      `}
                    >
                      <div className={`mr-3 p-1.5 rounded-md ${attr.isGlobal ? 'bg-primary/10' : 'bg-muted'}`}>
                        {attr.isGlobal ? (
                          <Globe className="h-4 w-4 text-primary" />
                        ) : (
                          getAttributeIcon(attr.type)
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-sm">{attr.name}</span>
                          {attr.unit && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {attr.unit}
                            </span>
                          )}
                        </div>
                        
                        {/* Value display based on type */}
                        <div className="mt-1">
                          {attr.type === 'BOOLEAN' ? (
                            <Badge 
                              variant={attr.value === true || attr.value === 'true' ? 'default' : 'destructive'} 
                              className="text-xs font-normal"
                            >
                              {attr.value === true || attr.value === 'true' ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Sí
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  No
                                </span>
                              )}
                            </Badge>
                          ) : attr.type === 'LIST' ? (
                            <Badge 
                              variant="secondary" 
                              className="text-xs font-normal"
                            >
                              {attr.value || 'No especificado'}
                            </Badge>
                          ) : (
                            <span className="text-sm">
                              {attr.value || 'No especificado'}
                            </span>
                          )}
                        </div>
                        
                        {/* Additional metadata */}
                        {attr.helpText && (
                          <p className="text-xs text-muted-foreground mt-1">{attr.helpText}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {attr.type === 'NUMBER' && (attr.minValue !== null || attr.maxValue !== null) && (
                            <span className="text-xs bg-background px-2 py-0.5 rounded border">
                              Rango: {attr.minValue !== null ? attr.minValue : '-'} a {attr.maxValue !== null ? attr.maxValue : '-'}
                            </span>
                          )}
                          {attr.type === 'STRING' && attr.regex && (
                            <span className="text-xs bg-background px-2 py-0.5 rounded border">
                              Formato: {attr.regex}
                            </span>
                          )}
                          {attr.dependsOn && (
                            <span className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Dependiente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
