/**
 * Servicio para manejo de tap-orders (sistema nuevo de órdenes)
 *
 * Endpoints:
 * - POST /api/tap-orders/restaurant/:restaurantId/table/:tableNumber/dishes - Crear dish order individual
 * - PATCH /api/tap-orders/:id/payment-status - Actualizar estado de pago
 * - GET /api/tap-orders/:id - Obtener orden por ID
 * - GET /api/tap-orders/restaurant/:restaurantId/table/:tableNumber - Obtener órdenes de una mesa
 */

import { BaseApiService } from "./base.service";
import { ApiResponse } from "@/types/api.types";

// Tipos para tap-orders (individual dish creation)
export interface CreateTapDishOrderRequest {
  item: string; // Nombre del platillo
  price: number; // Precio del platillo
  quantity: number; // Cantidad
  customer_name: string; // Nombre del cliente
  customer_phone?: string | null; // Teléfono opcional
  customer_email?: string | null; // Email opcional
  clerk_user_id?: string | null; // ID de Clerk si está loggeado, o guest_id si no lo está
  custom_fields?: any | null; // Custom fields seleccionados
  images?: string[] | null; // Array con una URL de imagen
  extra_price?: number; // Precio extra por custom fields
}

export interface UpdatePaymentStatusRequest {
  paymentStatus: "pending" | "paid" | "failed";
  paymentId?: string;
}

// Tipos para dish individual
export interface Dish {
  id: string;
  item: string;
  quantity: number;
  price: number;
  extra_price: number;
  status: "pending" | "in_progress" | "ready" | "delivered";
  payment_status: "not_paid" | "paid";
  total_price: number;
  images: string[];
  custom_fields: any | null;
  user_order_id: string | null;
  tap_order_id: string;
}

export interface TapOrderInfo {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  clerk_user_id: string | null;
  total_amount: number;
  payment_status: "pending" | "paid" | "failed";
  order_status: "pending" | "completed";
  created_at: string;
  updated_at: string;
}

export interface TableInfo {
  id: string;
  table_number: number;
  restaurant_id: number;
  status: string;
}

export interface OrderSummary {
  total_dishes: number;
  total_items: number;
  calculated_total: number;
}

export interface TapOrder {
  tap_order: TapOrderInfo;
  table: TableInfo;
  dishes: Dish[];
  summary: OrderSummary;
}

// Respuesta del backend (anidada)
export interface TapOrderResponse {
  data: TapOrder;
}

class TapOrderService extends BaseApiService {
  // Crear un dish order individual (se llama múltiples veces para crear una orden completa)
  async createDishOrder(
    restaurantId: string,
    tableNumber: string,
    dishData: CreateTapDishOrderRequest
  ): Promise<ApiResponse<any>> {
    return this.post(
      `/tap-orders/restaurant/${restaurantId}/table/${tableNumber}/dishes`,
      dishData
    );
  }

  // Actualizar estado de pago de una orden
  async updatePaymentStatus(
    orderId: string,
    status: "pending" | "paid" | "failed"
  ): Promise<ApiResponse<any>> {
    return this.patch(`/tap-orders/${orderId}/payment-status`, {
      payment_status: status,
    });
  }

  // Actualizar estado de la orden
  async updateOrderStatus(
    orderId: string,
    status: "pending" | "completed"
  ): Promise<ApiResponse<any>> {
    return this.patch(`/tap-orders/${orderId}/status`, { status });
  }

  // Obtener una orden por ID
  async getOrderById(orderId: string): Promise<ApiResponse<TapOrderResponse>> {
    return this.get(`/tap-orders/${orderId}`);
  }
}

export const tapOrderService = new TapOrderService();
