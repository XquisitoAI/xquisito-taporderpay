/**
 * @deprecated Este archivo se mantiene solo para compatibilidad con código legacy.
 *
 * IMPORTANTE: Para código nuevo, usar los servicios modulares desde @/services/api
 *
 * Servicios recomendados:
 * - tableService: Para operaciones de mesa
 * - orderService: Para operaciones de órdenes
 * - splitBillService: Para división de cuenta
 *
 * Ver documentación en: API_REFACTORING.md
 */

// ===============================================
// RE-EXPORTS DE TIPOS (COMPATIBILIDAD)
// ===============================================

// IMPORTANTE: Los tipos se han movido a @/types para mejor organización
// Se re-exportan aquí solo para compatibilidad con código legacy
export type {
  DishOrder,
  CreateDishOrderRequest,
} from "@/types/table.types";

// ===============================================
// RE-EXPORTS DE SERVICIOS (COMPATIBILIDAD)
// ===============================================

// IMPORTANTE: La funcionalidad de API se ha movido a servicios modulares
// Se re-exporta aquí solo para compatibilidad con código legacy

/**
 * @deprecated Usar apiService desde api2 en su lugar:
 * - apiService.getTableOrders()
 * - apiService.createDishOrder()
 */
import { apiService } from "../utils/api2";
export { apiService as tableApi };
