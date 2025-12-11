const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Review {
  id: number;
  menu_item_id: number;
  reviewer_identifier: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  menu_item_id: number;
  total_reviews: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  last_review_date: string;
}

// Wrapper type para respuestas del backend que tienen estructura anidada { data: { data: T } }
export interface NestedApiResponse<T> {
  data: T;
}

class ReviewsService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      };

      const authToken = this.getAuthToken();
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      } else {
        const guestId = this.getGuestId();
        if (guestId) {
          headers["x-guest-id"] = guestId;
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
      console.error("Reviews API Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("xquisito_access_token");
  }

  private getGuestId(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("xquisito-guest-id") || "";
  }

  // Crear una review
  async createReview(data: {
    menu_item_id: number;
    rating: number;
    user_id?: string | null;
    guest_id?: string | null;
  }): Promise<ApiResponse<Review>> {
    return this.request("/restaurants/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Obtener reviews de un platillo
  async getReviewsByMenuItem(
    menuItemId: number
  ): Promise<ApiResponse<Review[]>> {
    return this.request(`/restaurants/reviews/menu-item/${menuItemId}`, {
      method: "GET",
    });
  }

  // Obtener estadísticas de un platillo
  async getMenuItemStats(
    menuItemId: number
  ): Promise<ApiResponse<NestedApiResponse<ReviewStats>>> {
    return this.request(
      `/restaurants/reviews/menu-item/${menuItemId}/stats`,
      {
        method: "GET",
      }
    );
  }

  // Obtener review del usuario actual para un platillo
  async getMyReview(
    menuItemId: number,
    userId: string | null,
    guestId: string | null
  ): Promise<ApiResponse<NestedApiResponse<Review | null>>> {
    const queryParam = userId || guestId;
    return this.request(
      `/restaurants/reviews/menu-item/${menuItemId}/my-review/${queryParam}`,
      {
        method: "GET",
      }
    );
  }

  // Actualizar una review
  async updateReview(
    reviewId: number,
    rating: number,
    user_id: string | null,
    guest_id: string | null
  ): Promise<ApiResponse<Review>> {
    return this.request(`/restaurants/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({ rating, user_id, guest_id }),
    });
  }

  // Eliminar una review
  async deleteReview(
    reviewId: number
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/restaurants/reviews/${reviewId}`, {
      method: "DELETE",
    });
  }
}

export const reviewsService = new ReviewsService();

// Alias para mantener compatibilidad con código existente
export const reviewsApi = {
  createReview: (data: {
    menu_item_id: number;
    rating: number;
    user_id?: string | null;
    guest_id?: string | null;
  }) => reviewsService.createReview(data),
  getReviewsByMenuItem: (menuItemId: number) =>
    reviewsService.getReviewsByMenuItem(menuItemId),
  getMenuItemStats: (menuItemId: number) =>
    reviewsService.getMenuItemStats(menuItemId),
  getMyReview: (
    menuItemId: number,
    userId: string | null,
    guestId: string | null
  ) => reviewsService.getMyReview(menuItemId, userId, guestId),
  updateReview: (
    reviewId: number,
    rating: number,
    user_id: string | null,
    guest_id: string | null
  ) => reviewsService.updateReview(reviewId, rating, user_id, guest_id),
  deleteReview: (reviewId: number) => reviewsService.deleteReview(reviewId),
};
