import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, UserPlus } from "lucide-react";
import { useState } from "react";

export function CustomerActions() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 shadow-sm"> {/* Cambiado de gap-3 a gap-2 */}
      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cliente:</span>
      <button
        onClick={() => setSelectedCustomer('general')}
        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all duration-200 ${
          selectedCustomer === 'general'
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
        }`}
      >
        <User className={`h-4 w-4 ${selectedCustomer === 'general' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`} />
        General
      </button>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
        style={{ marginLeft: 4 }}
      >
        <UserPlus className="h-4 w-4" />
        Nuevo
      </button>
      <div className="flex-1">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cliente"
          className="border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
}
