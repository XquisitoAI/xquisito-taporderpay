/**
 * Servicio para manejo de pagos y métodos de pago
 */

import { BaseApiService } from "./base.service";
import { ApiResponse } from "@/types/api.types";
import {
  PaymentMethod,
  AddPaymentMethodRequest,
  ProcessPaymentRequest,
  PaymentHistory,
} from "@/types/payment.types";

class PaymentService extends BaseApiService {
  /**
   * Añadir método de pago
   */
  async addPaymentMethod(
    paymentData: AddPaymentMethodRequest
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return this.post("/payment-methods", paymentData);
  }

  /**
   * Obtener métodos de pago del usuario
   */
  async getPaymentMethods(): Promise<
    ApiResponse<{ paymentMethods: PaymentMethod[] }>
  > {
    return this.get("/payment-methods");
  }

  /**
   * Eliminar método de pago
   */
  async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/payment-methods/${paymentMethodId}`);
  }

  /**
   * Establecer método de pago como predeterminado
   */
  async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.put(`/payment-methods/${paymentMethodId}/default`);
  }

  /**
   * Procesar pago
   */
  async processPayment(
    paymentData: ProcessPaymentRequest
  ): Promise<ApiResponse<any>> {
    return this.post("/payments", paymentData);
  }

  /**
   * Obtener historial de pagos
   */
  async getPaymentHistory(): Promise<ApiResponse<PaymentHistory[]>> {
    return this.get("/payments/history");
  }
}

export const paymentService = new PaymentService();
