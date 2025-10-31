/**
 * Servicio base para todas las llamadas API
 * Proporciona funcionalidad HTTP común y manejo de autenticación
 */

import { ApiResponse } from "@/types/api.types";
import { guestStorageService } from "../storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class BaseApiService {
  protected baseURL: string;
  private authToken?: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Establecer token de autenticación para usuarios de Clerk
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Limpiar token de autenticación
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Método genérico para hacer peticiones HTTP
   */
  protected async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    authToken?: string
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      // Añadir token de autenticación si está disponible
      const tokenToUse = authToken || this.authToken;
      if (tokenToUse) {
        // Para usuarios registrados, usar auth token y omitir headers de invitado
        headers["Authorization"] = `Bearer ${tokenToUse}`;
        console.log("🔑 Using Authorization token for request to:", endpoint);
      } else {
        // Solo para invitados, añadir headers de identificación de invitado
        const guestId = guestStorageService.getGuestId();
        if (guestId) {
          headers["x-guest-id"] = guestId;
          console.log("👥 Using x-guest-id for request to:", endpoint, "guestId:", guestId);
        }

        // Añadir número de mesa si está disponible
        const tableNumber = guestStorageService.getTableNumber();
        if (tableNumber) {
          headers["x-table-number"] = tableNumber;
        }
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

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

  /**
   * Método GET
   */
  protected async get<T = any>(
    endpoint: string,
    authToken?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "GET" }, authToken);
  }

  /**
   * Método POST
   */
  protected async post<T = any>(
    endpoint: string,
    body?: any,
    authToken?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      },
      authToken
    );
  }

  /**
   * Método PUT
   */
  protected async put<T = any>(
    endpoint: string,
    body?: any,
    authToken?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      },
      authToken
    );
  }

  /**
   * Método PATCH
   */
  protected async patch<T = any>(
    endpoint: string,
    body?: any,
    authToken?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      },
      authToken
    );
  }

  /**
   * Método DELETE
   */
  protected async delete<T = any>(
    endpoint: string,
    authToken?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "DELETE" }, authToken);
  }
}
