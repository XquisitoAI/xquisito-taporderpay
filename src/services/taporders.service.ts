const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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

export interface TapOrderResponse {
  data: TapOrder;
}

export interface DishOrderData {
  user_id: string | null;
  guest_id: string | null;
  guest_name: string;
  item_name: string;
  quantity: number;
  price: number;
  branch_number: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  clerk_user_id?: string | null;
  images?: string[];
  custom_fields?: any;
  extra_price?: number;
}

export interface PaymentTransactionData {
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
}

class TapOrderService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      };

      // Add authentication headers (similar to cartApi)
      const authToken = this.getAuthToken();
      if (authToken) {
        // For authenticated users, use Bearer token
        headers["Authorization"] = `Bearer ${authToken}`;
      } else {
        // For guests, add guest identification headers
        const guestId = this.getGuestId();
        if (guestId) {
          headers["x-guest-id"] = guestId;
        }

        // Add table number if available
        const tableNumber = this.getTableNumber();
        if (tableNumber) {
          headers["x-table-number"] = tableNumber;
        }
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "API request failed");
      }

      return data;
    } catch (error) {
      console.error("Tap Order API Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Obtener el token de autenticación desde localStorage
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("xquisito_access_token");
  }

  // Obtener guest_id desde localStorage
  private getGuestId(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("xquisito-guest-id") || "";
  }

  // Obtener número de mesa desde localStorage
  private getTableNumber(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("xquisito-table-number");
  }

  // Crear una orden de platillo (dish order)
  async createDishOrder(
    restaurantId: string,
    branchNumber: string,
    tableNumber: string,
    dishOrderData: DishOrderData
  ): Promise<ApiResponse<any>> {
    return this.request(
      `/tap-orders/restaurant/${restaurantId}/branch/${branchNumber}/table/${tableNumber}/dishes`,
      {
        method: "POST",
        body: JSON.stringify(dishOrderData),
      }
    );
  }

  // Actualizar el estado de pago de una orden tap
  async updatePaymentStatus(
    tapOrderId: string,
    paymentStatus: "pending" | "paid" | "failed"
  ): Promise<ApiResponse<any>> {
    return this.request(`/tap-orders/${tapOrderId}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify({ payment_status: paymentStatus }),
    });
  }

  // Actualizar el estado de una orden tap
  async updateOrderStatus(
    tapOrderId: string,
    orderStatus: "pending" | "completed"
  ): Promise<ApiResponse<any>> {
    return this.request(`/tap-orders/${tapOrderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: orderStatus }),
    });
  }

  // Registrar transacción de pago para trazabilidad
  async recordPaymentTransaction(
    transactionData: PaymentTransactionData
  ): Promise<ApiResponse<any>> {
    return this.request("/payment-transactions", {
      method: "POST",
      body: JSON.stringify(transactionData),
    });
  }

  // Marcar dish order como pagado
  async markDishOrderAsPaid(dishOrderId: string): Promise<ApiResponse<any>> {
    return this.request(`/dish-orders/${dishOrderId}/mark-paid`, {
      method: "POST",
    });
  }

  // Obtener una orden por ID
  async getOrderById(orderId: string): Promise<ApiResponse<TapOrderResponse>> {
    return this.request(`/tap-orders/${orderId}`, {
      method: "GET",
    });
  }
}

export const tapOrderService = new TapOrderService();
