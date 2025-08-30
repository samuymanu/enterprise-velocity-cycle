/**
 * Normaliza una respuesta de API a un arreglo seguro.
 * Maneja formas comunes: [], { data: [...] }, { items: [...] }, { customers: [...] }, o un único objeto.
 * Devuelve siempre un arreglo (posiblemente vacío) para evitar errores como "something.map is not a function".
 */
export function normalizeApiArray(response: unknown): any[] {
  if (!response) return [];

  try {
    // Respuesta ya es un arreglo
    if (Array.isArray(response)) return response as any[];

    if (typeof response === 'object' && response !== null) {
      const anyResp = response as any;

      // Campos comunes que contienen listas
      const candidates = [anyResp.data, anyResp.items, anyResp.customers, anyResp.results, anyResp.payload, anyResp];

      for (const c of candidates) {
        if (Array.isArray(c)) return c;
      }

      // Si no encontramos un arreglo pero tenemos un objeto, intentar envolverlo
      // Esto cubre respuestas que retornan un solo recurso en lugar de una lista
      if (anyResp && typeof anyResp === 'object') return [anyResp];
    }

    return [];
  } catch (err) {
    // En caso de cualquier error, devolver arreglo vacío para seguridad en render
    // eslint-disable-next-line no-console
    console.warn('normalizeApiArray fallo al normalizar respuesta', err);
    return [];
  }
}
