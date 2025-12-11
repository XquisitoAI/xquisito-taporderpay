const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    type?: string;
    message: string;
    details?: any;
  };
}

export interface PaymentMethod {
  id: string;
  lastFourDigits: string;
  cardBrand: string;
  cardType: string;
  isDefault: boolean;
}

export interface AddPaymentMethodRequest {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export interface ProcessPaymentRequest {
  paymentMethodId: string;
  amount: number;
  currency: string;
  description: string;
  orderId: string;
  tableNumber: string;
  restaurantId: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  date: string;
  status: string;
}

class PaymentService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      };

      // Add authentication headers
      const authToken = this.getAuthToken();
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      } else {
        // For guests, add guest identification headers
        const guestId = this.getGuestId();
        if (guestId) {
          headers["x-guest-id"] = guestId;
        }

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
        return {
          success: false,
          error: {
            type: "http_error",
            message:
              data.error?.message || data.message || "API request failed",
            details: data,
          },
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("Payment API Error:", error);
      return {
        success: false,
        error: {
          type: "network_error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
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

  // Añadir método de pago
  async addPaymentMethod(
    paymentData: AddPaymentMethodRequest
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return this.request("/payment-methods", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  // Obtener métodos de pago del usuario
  async getPaymentMethods(): Promise<
    ApiResponse<{ paymentMethods: PaymentMethod[] }>
  > {
    return this.request("/payment-methods", {
      method: "GET",
    });
  }

  // Eliminar método de pago
  async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/payment-methods/${paymentMethodId}`, {
      method: "DELETE",
    });
  }

  // Establecer método de pago como predeterminado
  async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/payment-methods/${paymentMethodId}/default`, {
      method: "PUT",
    });
  }

  // Procesar pago
  async processPayment(
    paymentData: ProcessPaymentRequest
  ): Promise<ApiResponse<any>> {
    return this.request("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  // Obtener historial de pagos
  async getPaymentHistory(): Promise<ApiResponse<PaymentHistory[]>> {
    return this.request("/payments/history", {
      method: "GET",
    });
  }
}

export const paymentService = new PaymentService();
