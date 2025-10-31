/**
 * Punto de entrada principal para todos los servicios
 */

// Servicios API
export * from "./api";

// Servicios de almacenamiento
export * from "./storage";

// Validadores
export * from "./validators";

// Compatibilidad con código legacy - ahora usando api2
export { apiService } from "../utils/api2";
