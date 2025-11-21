/**
 * @deprecated Este archivo se mantiene solo para compatibilidad con código legacy.
 *
 * IMPORTANTE: Para código nuevo, usar los servicios modulares desde @/services
 *
 * Nuevos servicios disponibles:
 * - paymentService: Gestión de pagos
 * - tableService: Gestión de mesas
 * - orderService: Gestión de órdenes
 * - splitBillService: División de cuenta
 * - userService: Información de usuarios
 * - restaurantService: Gestión de restaurantes
 * - guestStorageService: Almacenamiento de invitados
 *
 * Ver documentación en: API_REFACTORING.md
 */

// Re-exportar tipos desde la nueva ubicación centralizada
export type { ApiResponse } from "@/types/api.types";
export type { PaymentMethod, AddPaymentMethodRequest } from "@/types/payment.types";

// Re-exportar validadores desde su nueva ubicación
export {
  validateCardNumber,
  getCardType,
  formatCardNumber,
  formatExpiryDate,
} from "@/services/validators/card-validator";

// Importar servicios modulares
import { paymentService } from "@/services/api/payment.service";
import { tableService } from "@/services/api/table.service";
import { orderService } from "@/services/api/order.service";
import { guestStorageService } from "@/services/storage/guest-storage.service";
import { BaseApiService } from "@/services/api/base.service";

/**
 * Clase ApiService mantenida para compatibilidad legacy.
 * Internamente redirige a los nuevos servicios modulares.
 *
 * @deprecated Usar servicios modulares desde @/services en lugar de esta clase.
 *
 * Ejemplo de migración:
 * ```
 * // Antes
 * import { apiService } from '../utils/api';
 * await apiService.getTableSummary(restaurantId, tableNumber);
 *
 * // Ahora (recomendado)
 * import { tableService } from '@/services/api';
 * await tableService.getSummary(restaurantId, tableNumber);
 * ```
 */
class ApiService extends BaseApiService {
  // Sobrescribir setAuthToken para propagar a todos los servicios
  setAuthToken(token: string): void {
    super.setAuthToken(token);
    // También configurar en los servicios modulares
    paymentService.setAuthToken(token);
    tableService.setAuthToken(token);
    orderService.setAuthToken(token);
  }

  // Sobrescribir clearAuthToken para propagar a todos los servicios
  clearAuthToken(): void {
    super.clearAuthToken();
    paymentService.clearAuthToken();
    tableService.clearAuthToken();
    orderService.clearAuthToken();
  }

  // ===============================================
  // PAYMENT METHODS - Redirige a paymentService
  // ===============================================

  async addPaymentMethod(...args: Parameters<typeof paymentService.addPaymentMethod>) {
    return paymentService.addPaymentMethod(...args);
  }

  async getPaymentMethods() {
    return paymentService.getPaymentMethods();
  }

  async deletePaymentMethod(paymentMethodId: string) {
    return paymentService.deletePaymentMethod(paymentMethodId);
  }

  async setDefaultPaymentMethod(paymentMethodId: string) {
    return paymentService.setDefaultPaymentMethod(paymentMethodId);
  }

  async processPayment(paymentData: any) {
    return paymentService.processPayment(paymentData);
  }

  async getPaymentHistory() {
    return paymentService.getPaymentHistory();
  }

  /**
   * Registrar transacción de pago para trazabilidad máxima
   */
  async recordPaymentTransaction(transactionData: {
    payment_method_id: string | null;
    restaurant_id: number;
    id_table_order?: string | null;
    id_tap_orders_and_pay?: string | null;
    base_amount: number;
    tip_amount: number;
    iva_tip: number;
    xquisito_commission_total: number;
    xquisito_commission_client: number;
    xquisito_commission_restaurant: number;
    iva_xquisito_client: number;
    iva_xquisito_restaurant: number;
    xquisito_client_charge: number;
    xquisito_restaurant_charge: number;
    xquisito_rate_applied: number;
    total_amount_charged: number;
    subtotal_for_commission: number;
    currency?: string;
  }) {
    return this.post("/payment-transactions", transactionData);
  }

  // ===============================================
  // GUEST STORAGE - Redirige a guestStorageService
  // ===============================================

  setGuestInfo(guestId?: string, tableNumber?: string, restaurantId?: string) {
    return guestStorageService.setGuestInfo(guestId, tableNumber, restaurantId);
  }

  setTableNumber(tableNumber: string) {
    return guestStorageService.setTableNumber(tableNumber);
  }

  setRestaurantId(restaurantId: string) {
    return guestStorageService.setRestaurantId(restaurantId);
  }

  getCurrentRestaurantId() {
    return guestStorageService.getRestaurantId();
  }

  clearGuestSession() {
    return guestStorageService.clearGuestSession();
  }

  // ===============================================
  // TABLE API - Redirige a tableService
  // ===============================================

  async getTableOrders(restaurantId: string, tableNumber: string) {
    return tableService.getOrders(restaurantId, tableNumber);
  }

  async getAllTables(restaurantId: string) {
    return tableService.getAll(restaurantId);
  }

  async checkTableAvailability(restaurantId: string, tableNumber: string) {
    return tableService.checkAvailability(restaurantId, tableNumber);
  }

  // ===============================================
  // ORDER API - Redirige a orderService y tap-orders
  // ===============================================

  /**
   * Crear dish order - acepta parámetros individuales (legacy) u objeto
   */
  async createDishOrder(
    restaurantId: string,
    tableNumber: string,
    dataOrUserId: any,
    guestName?: string,
    item?: string,
    quantity?: number,
    price?: number,
    guestId?: string | null,
    images: string[] = [],
    customFields?: any,
    extraPrice?: number
  ) {
    // Si el tercer parámetro es un objeto, es el nuevo formato de tap-order-and-pay
    if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
      const dishOrderData = dataOrUserId;
      // Usar el endpoint correcto de tap-orders para crear dish
      return this.post(`/tap-orders/restaurant/${restaurantId}/table/${tableNumber}/dishes`, dishOrderData);
    }

    // Si no, es el formato legacy con parámetros individuales
    return orderService.createDishOrder(restaurantId, tableNumber, {
      userId: dataOrUserId,
      guestName: guestName!,
      item: item!,
      quantity: quantity!,
      price: price!,
      guestId,
      images,
      customFields,
      extraPrice,
    });
  }

  async updateDishStatus(dishId: string, status: string) {
    return orderService.updateDishStatus(dishId, status as any);
  }

  async linkGuestOrdersToUser(
    guestId: string,
    userId: string,
    tableNumber?: string,
    restaurantId?: string
  ) {
    return orderService.linkGuestOrdersToUser(guestId, userId, tableNumber, restaurantId);
  }

  // ===============================================
  // TAP ORDERS API - Métodos específicos de tap-order-and-pay
  // ===============================================

  /**
   * Actualizar el estado de pago de una orden tap
   */
  async updatePaymentStatus(
    tapOrderId: string,
    paymentStatus: "pending" | "paid" | "failed"
  ) {
    return this.patch(`/tap-orders/${tapOrderId}/payment-status`, {
      payment_status: paymentStatus,
    });
  }

  /**
   * Actualizar el estado de una orden tap
   */
  async updateOrderStatus(
    tapOrderId: string,
    orderStatus: "pending" | "completed"
  ) {
    return this.patch(`/tap-orders/${tapOrderId}/status`, {
      status: orderStatus,
    });
  }
}

// Exportar instancia única para compatibilidad con código legacy
export const apiService = new ApiService();

// Exportar como default para compatibilidad
export default apiService;
