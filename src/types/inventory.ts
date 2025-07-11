// Tipos para atributos dinámicos y filtros
export interface Attribute {
  attributeId: string;
  name: string;
  type: string;
  isRequired: boolean;
  values: string[];
}

export interface DynamicFilters {
  [key: string]: string;
}
