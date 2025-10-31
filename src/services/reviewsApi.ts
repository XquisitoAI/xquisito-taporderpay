import { apiService, ApiResponse } from "../utils/api2";

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

// Usar apiService directamente desde api2
export const reviewsApi = {
  // Crear una review
  async createReview(data: {
    menu_item_id: number;
    rating: number;
    user_id?: string | null;
    guest_id?: string | null;
  }): Promise<ApiResponse<Review>> {
    return apiService.createReview(data);
  },

  // Obtener reviews de un platillo
  async getReviewsByMenuItem(
    menuItemId: number
  ): Promise<ApiResponse<Review[]>> {
    return apiService.getReviewsByMenuItem(menuItemId);
  },

  // Obtener estadísticas de un platillo
  async getMenuItemStats(
    menuItemId: number
  ): Promise<ApiResponse<NestedApiResponse<ReviewStats>>> {
    return apiService.getMenuItemStats(menuItemId);
  },

  // Obtener review del usuario actual para un platillo
  async getMyReview(
    menuItemId: number,
    userId: string | null,
    guestId: string | null
  ): Promise<ApiResponse<NestedApiResponse<Review | null>>> {
    return apiService.getMyReview(menuItemId, userId, guestId);
  },

  // Actualizar una review
  async updateReview(
    reviewId: number,
    rating: number,
    user_id: string | null,
    guest_id: string | null
  ): Promise<ApiResponse<Review>> {
    return apiService.updateReview(reviewId, rating, user_id, guest_id);
  },

  // Eliminar una review
  async deleteReview(
    reviewId: number
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.deleteReview(reviewId);
  },
};
