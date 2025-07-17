import { apiService } from '@/lib/api';
import { DynamicFilters as DynamicFiltersType } from '@/types/inventory';

// Tipos para atributos dinámicos y filtros
export interface Attribute {
  attributeId: string;
  name: string;
  type: string;
  isRequired: boolean;
  values: string[];
  unit?: string;
  helpText?: string;
  minValue?: number;
  maxValue?: number;
  regex?: string;
  isGlobal?: boolean;
  dependsOn?: string;
}

export interface DynamicFilters {
  [key: string]: string;
}
