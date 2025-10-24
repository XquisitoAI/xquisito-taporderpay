/**
 * Servicio para manejo de mesas y órdenes de mesa
 */

import { BaseApiService } from "./base.service";
import { ApiResponse } from "@/types/api.types";

class TableService extends BaseApiService {
  /**
   * Obtener órdenes de una mesa
   */
  async getOrders(
    restaurantId: string,
    tableNumber: string
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/restaurants/${restaurantId}/tables/${tableNumber}/orders`
    );
  }

  /**
   * Obtener todas las mesas de un restaurante
   */
  async getAll(restaurantId: string): Promise<ApiResponse<any>> {
    return this.get(`/restaurants/${restaurantId}/tables`);
  }

  /**
   * Verificar disponibilidad de una mesa
   */
  async checkAvailability(
    restaurantId: string,
    tableNumber: string
  ): Promise<ApiResponse<any>> {
    return this.get(
      `/restaurants/${restaurantId}/tables/${tableNumber}/availability`
    );
  }
}

export const tableService = new TableService();
