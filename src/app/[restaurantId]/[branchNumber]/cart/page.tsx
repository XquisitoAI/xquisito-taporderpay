"use client";

import { useValidateAccess } from "@/hooks/useValidateAccess";
import ValidationError from "@/components/ValidationError";
import CartView from "@/components/CartView";

export default function CartPage() {
  const { validationError } = useValidateAccess();

  // Mostrar error de validación
  if (validationError) {
    return <ValidationError errorType={validationError as any} />;
  }

  return <CartView />;
}
