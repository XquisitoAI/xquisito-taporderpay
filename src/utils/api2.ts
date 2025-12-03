// API configuration and helper functions for Xquisito frontend

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PaymentMethod {
  id: string;
  lastFourDigits: string;
  cardType: string;
  cardBrand: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
}

export interface AddPaymentMethodRequest {
  fullName: string;
  email: string;
  cardNumber: string;
  expDate: string;
  cvv: string;
}

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

class ApiService {
  private baseURL: string;
  private authToken?: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Set authentication token for Clerk users
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Clear authentication token
  clearAuthToken() {
    this.authToken = undefined;
  }

  // Clear all session data including table context
  clearAllSessionData() {
    this.clearAuthToken();
    // Clear session storage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("signupFromPaymentFlow");
      sessionStorage.removeItem("signupFromPaymentSuccess");
      sessionStorage.removeItem("signInFromMenu");
      sessionStorage.removeItem("signupFromOrder");
      sessionStorage.removeItem("pendingRestaurantId");
      // Clear localStorage guest data
      localStorage.removeItem("xquisito-guest-id");
      localStorage.removeItem("xquisito-table-number");
      localStorage.removeItem("xquisito-restaurant-id");
    }
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    authToken?: string,
    isRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      // Add authentication token for Clerk users
      const tokenToUse = authToken || this.authToken;
      if (tokenToUse) {
        // For registered users, use auth token and skip guest headers
        headers["Authorization"] = `Bearer ${tokenToUse}`;
      } else {
        // For guests only, add guest identification headers
        const guestId = this.getGuestId();
        if (guestId) {
          headers["x-guest-id"] = guestId;
          console.log("🔑 Adding x-guest-id header:", guestId);
        }

        // Add table number if available
        const tableNumber = this.getTableNumber();
        if (tableNumber) {
          headers["x-table-number"] = tableNumber;
        }
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle 401 Unauthorized - Token expired
      if (
        response.status === 401 &&
        !isRetry &&
        typeof window !== "undefined"
      ) {
        console.log("🔄 Token expired (401), attempting to refresh...");

        const refreshToken = localStorage.getItem("xquisito_refresh_token");
        if (refreshToken) {
          try {
            // Attempt to refresh the token
            const refreshResponse = await fetch(
              `${this.baseURL}/auth/refresh`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
              }
            );

            const refreshData = await refreshResponse.json();

            if (
              refreshResponse.ok &&
              refreshData.success &&
              refreshData.data?.session?.access_token
            ) {
              // Store new tokens
              const newAccessToken = refreshData.data.session.access_token;
              const newRefreshToken = refreshData.data.session.refresh_token;

              localStorage.setItem("xquisito_access_token", newAccessToken);
              localStorage.setItem("xquisito_refresh_token", newRefreshToken);
              this.authToken = newAccessToken;

              console.log(
                "✅ Token refreshed successfully, retrying original request"
              );

              // Retry the original request with the new token
              return this.makeRequest<T>(
                endpoint,
                options,
                newAccessToken,
                true
              );
            } else {
              console.log("❌ Token refresh failed, logging out user");
              this.handleAuthFailure();
            }
          } catch (refreshError) {
            console.error("❌ Error refreshing token:", refreshError);
            this.handleAuthFailure();
          }
        } else {
          console.log("❌ No refresh token available, logging out user");
          this.handleAuthFailure();
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            type: "http_error",
            message: data.error?.message || `HTTP Error: ${response.status}`,
            details: data,
          },
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("API Request failed:", error);

      return {
        success: false,
        error: {
          type: "network_error",
          message:
            error instanceof Error ? error.message : "Network error occurred",
          details: error,
        },
      };
    }
  }

  // Generic request method for external use
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, options);
  }

  // Payment Methods API
  async addPaymentMethod(
    paymentData: AddPaymentMethodRequest
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return this.makeRequest("/payment-methods", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentMethods(): Promise<
    ApiResponse<{ paymentMethods: PaymentMethod[] }>
  > {
    return this.makeRequest("/payment-methods");
  }

  async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/payment-methods/${paymentMethodId}`, {
      method: "DELETE",
    });
  }

  async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/payment-methods/${paymentMethodId}/default`, {
      method: "PUT",
    });
  }

  // Payment Processing API
  async processPayment(paymentData: {
    paymentMethodId: string;
    amount: number;
    currency?: string;
    description?: string;
    orderId?: string;
    tableNumber?: string;
    restaurantId?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentHistory(): Promise<ApiResponse<any>> {
    return this.makeRequest("/payments/history");
  }

  /**
   * Registrar transacción de pago para trazabilidad máxima
   */
  async recordPaymentTransaction(transactionData: {
    payment_method_id: string;
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
  }): Promise<ApiResponse<any>> {
    return this.makeRequest("/payment-transactions", {
      method: "POST",
      body: JSON.stringify(transactionData),
    });
  }

  // Helper methods for guest identification
  private getGuestId(): string | null {
    // Try to get existing guest ID from localStorage first
    if (typeof window !== "undefined") {
      let guestId = localStorage.getItem("xquisito-guest-id");

      if (!guestId) {
        // Generate new guest ID
        guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("xquisito-guest-id", guestId);
      }

      return guestId;
    }
    return null;
  }

  private getTableNumber(): string | null {
    // Get table number from localStorage or context
    if (typeof window !== "undefined") {
      return localStorage.getItem("xquisito-table-number");
    }
    return null;
  }

  private getRestaurantId(): string | null {
    // Get restaurant ID from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem("xquisito-restaurant-id");
    }
    return null;
  }

  // Method to explicitly set guest and table info (for better context integration)
  setGuestInfo(
    guestId?: string,
    tableNumber?: string,
    restaurantId?: string
  ): void {
    if (typeof window !== "undefined") {
      if (guestId) {
        localStorage.setItem("xquisito-guest-id", guestId);
      }
      if (tableNumber) {
        localStorage.setItem("xquisito-table-number", tableNumber);
      }
      if (restaurantId) {
        localStorage.setItem("xquisito-restaurant-id", restaurantId);
      }
    }
  }

  // Method to set table number (call this when user scans QR or selects table)
  setTableNumber(tableNumber: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("xquisito-table-number", tableNumber);
    }
  }

  // Method to set restaurant ID
  setRestaurantId(restaurantId: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("xquisito-restaurant-id", restaurantId);
    }
  }

  // Method to get current restaurant ID
  getCurrentRestaurantId(): string | null {
    return this.getRestaurantId();
  }

  // Method to clear guest session (guest-specific data only)
  clearGuestSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("xquisito-guest-id");
      // Note: Table number and restaurant ID are preserved for authenticated users
      // They are only cleared when user explicitly logs out
    }
  }

  // Method to clear all session data (for logout)
  clearAllSessionData(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("xquisito-guest-id");
      localStorage.removeItem("xquisito-table-number");
      localStorage.removeItem("xquisito-restaurant-id");
      localStorage.removeItem("xquisito-guest-name");
    }
  }

  // ===============================================
  // TABLE API CALLS
  // ===============================================

  /**
   * Get table summary information
   */
  async getTableSummary(
    restaurantId: string,
    tableNumber: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(
      `/restaurants/${restaurantId}/tables/${tableNumber}/summary`
    );
  }

  /**
   * Get table orders
   */
  async getTableOrders(
    restaurantId: string,
    tableNumber: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(
      `/restaurants/${restaurantId}/tables/${tableNumber}/orders`
    );
  }

  /**
   * Get active users for a table
   */
  async getActiveUsers(
    restaurantId: string,
    tableNumber: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(
      `/restaurants/${restaurantId}/tables/${tableNumber}/active-users`
    );
  }

  /**
   * Get all tables for a restaurant
   */
  async getAllTables(restaurantId: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants/${restaurantId}/tables`);
  }

  /**
   * Check table availability
   */
  async checkTableAvailability(
    restaurantId: string,
    tableNumber: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(
      `/restaurants/${restaurantId}/tables/${tableNumber}/availability`
    );
  }

  // ===============================================
  // ORDER API CALLS
  // ===============================================

  /**
   * Update dish status (for kitchen)
   */
  async updateDishStatus(
    dishId: string,
    status: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/dishes/${dishId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // ===============================================
  // PAYMENT API CALLS FOR TABLES
  // ===============================================

  /**
   * Pay for a specific dish order
   */
  async payDishOrder(
    dishId: string,
    paymentMethodId?: string | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/dishes/${dishId}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentMethodId }),
    });
  }

  /**
   * Pay a specific amount for a table
   */
  async payTableAmount(
    restaurantId: string,
    tableNumber: string,
    amount: number,
    userId?: string | null,
    guestName?: string | null,
    paymentMethodId?: string | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(
      `/restaurants/${restaurantId}/tables/${tableNumber}/pay`,
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          userId,
          guestName,
          paymentMethodId,
        }),
      }
    );
  }

  /**
   * Link guest orders to authenticated user
   */
  async linkGuestOrdersToUser(
    guestId: string,
    userId: string,
    tableNumber?: string,
    restaurantId?: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/orders/link-user`, {
      method: "PUT",
      body: JSON.stringify({
        guestId,
        userId,
        tableNumber,
        restaurantId,
      }),
    });
  }

  /**
   * Get multiple users info (images, names, etc) from Clerk
   */
  async getUsersInfo(userIds: string[]): Promise<
    ApiResponse<
      Record<
        string,
        {
          imageUrl: string | null;
          firstName: string | null;
          lastName: string | null;
          fullName: string | null;
        }
      >
    >
  > {
    return this.makeRequest(`/users/info`, {
      method: "POST",
      body: JSON.stringify({
        userIds,
      }),
    });
  }

  // ===============================================
  // TAP-ORDER API CALLS (nuevo sistema de órdenes)
  // ===============================================

  /**
   * Create a dish order (se llama múltiples veces para crear una orden completa)
   */
  async createDishOrder(
    restaurantId: string,
    tableNumber: string,
    dishData: CreateTapDishOrderRequest
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(
      `/tap-orders/restaurant/${restaurantId}/table/${tableNumber}/dishes`,
      {
        method: "POST",
        body: JSON.stringify(dishData),
      }
    );
  }

  /**
   * Update payment status of a tap-order
   */
  async updatePaymentStatus(
    orderId: string,
    status: "pending" | "paid" | "failed"
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tap-orders/${orderId}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify({ payment_status: status }),
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: "pending" | "completed"
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tap-orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse<TapOrderResponse>> {
    return this.makeRequest(`/tap-orders/${orderId}`);
  }

  // ===============================================
  // RESTAURANT API CALLS
  // ===============================================

  /**
   * Get restaurant by ID
   */
  async getRestaurantById(restaurantId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants/${restaurantId}`);
  }

  /**
   * Get restaurant menu
   */
  async getRestaurantMenu(restaurantId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants/${restaurantId}/menu`);
  }

  /**
   * Get restaurant with complete menu in one request
   */
  async getRestaurantWithMenu(restaurantId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants/${restaurantId}/complete`);
  }

  /**
   * Get all restaurants
   */
  async getAllRestaurants(): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants`);
  }

  // ===============================================
  // REVIEWS API CALLS
  // ===============================================

  /**
   * Create a review for a menu item
   */
  async createReview(data: {
    menu_item_id: number;
    rating: number;
    user_id?: string | null;
    guest_id?: string | null;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest("/restaurants/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get reviews for a menu item
   */
  async getReviewsByMenuItem(menuItemId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants/reviews/menu-item/${menuItemId}`);
  }

  /**
   * Get review statistics for a menu item
   */
  async getMenuItemStats(menuItemId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(
      `/restaurants/reviews/menu-item/${menuItemId}/stats`
    );
  }

  /**
   * Get current user's review for a menu item
   */
  async getMyReview(
    menuItemId: number,
    userId: string | null,
    guestId: string | null
  ): Promise<ApiResponse<any>> {
    const queryParam = userId || guestId;
    return this.makeRequest(
      `/restaurants/reviews/menu-item/${menuItemId}/my-review/${queryParam}`
    );
  }

  /**
   * Update a review
   */
  async updateReview(
    reviewId: number,
    rating: number,
    user_id: string | null,
    guest_id: string | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({ rating, user_id, guest_id }),
    });
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: number): Promise<ApiResponse<any>> {
    return this.makeRequest(`/restaurants/reviews/${reviewId}`, {
      method: "DELETE",
    });
  }

  // ===============================================
  // GENERIC REQUEST METHOD
  // ===============================================

  /**
   * Generic request method for external use
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, options);
  }

  /**
   * Handle authentication failures by clearing tokens and redirecting to auth
   */
  private handleAuthFailure(): void {
    console.log("🚨 Authentication failure - clearing tokens and redirecting to auth");

    // Clear all auth-related tokens
    this.authToken = undefined;
    if (typeof window !== "undefined") {
      localStorage.removeItem("xquisito_access_token");
      localStorage.removeItem("xquisito_refresh_token");
      sessionStorage.removeItem("was_authenticated");

      // Redirect to auth page if not already there
      if (!window.location.pathname.includes('/auth')) {
        const currentUrl = new URL(window.location.href);
        const restaurantId = currentUrl.pathname.split('/')[1];
        const tableNumber = currentUrl.searchParams.get('table');

        let redirectUrl = `/${restaurantId}/auth`;
        if (tableNumber) {
          redirectUrl += `?table=${tableNumber}`;
        }

        console.log("🔄 Redirecting to:", redirectUrl);
        window.location.href = redirectUrl;
      }
    }
  }
}

export const apiService = new ApiService();

// Utility functions for payment data validation
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s/g, "");

  // Basic Luhn algorithm validation
  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0 && cleaned.length >= 13 && cleaned.length <= 19;
};

export const getCardType = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, "");

  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleaned)) {
      return type;
    }
  }

  return "unknown";
};

export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, "");
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(" ").substr(0, 19); // Max 16 digits + 3 spaces
};

export const formatExpiryDate = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length >= 2) {
    return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
  }
  return cleaned;
};

export default apiService;
