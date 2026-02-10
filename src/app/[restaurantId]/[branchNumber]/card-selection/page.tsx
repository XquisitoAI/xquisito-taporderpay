"use client";

import { useCart } from "@/context/CartContext";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { usePayment } from "@/context/PaymentContext";
import { useValidateAccess } from "@/hooks/useValidateAccess";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import { Plus, Trash2, Loader2, CircleAlert, X } from "lucide-react";
import { getCardTypeIcon } from "@/utils/cardIcons";
import Loader from "@/components/UI/Loader";
import OrderAnimation from "@/components/UI/OrderAnimation";
import ValidationError from "@/components/ValidationError";
import { tapOrderService } from "@/services/taporders.service";
import { paymentService } from "@/services/payment.service";
import { calculateCommissions } from "@/utils/commissionCalculator";

export default function CardSelectionPage() {
  const {
    validationError,
    restaurantId: restaurantIdNum,
    branchNumber,
  } = useValidateAccess();
  const restaurantId = restaurantIdNum.toString();

  const { state: cartState, clearCart } = useCart();
  const { navigateWithTable, tableNumber } = useTableNavigation();
  const { paymentMethods, deletePaymentMethod } = usePayment();
  const { user, profile, isAuthenticated } = useAuth();
  const router = useRouter();

  // Tarjeta por defecto del sistema para todos los usuarios
  const defaultSystemCard = {
    id: "system-default-card",
    lastFourDigits: "1234",
    cardBrand: "amex",
    cardType: "credit",
    isDefault: true,
    isSystemCard: true,
  };

  // Combinar tarjetas del sistema con las del usuario
  const allPaymentMethods = [defaultSystemCard, ...paymentMethods];

  // Obtener monto base del carrito desde el contexto
  const baseAmount = cartState.totalPrice;

  // Validación de compra mínima
  const MINIMUM_AMOUNT = 20; // Mínimo de compra requerido

  // Estados para propina
  const [tipPercentage, setTipPercentage] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [selectedMSI, setSelectedMSI] = useState<number | null>(null);

  // Estados para tarjetas
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Estado para mostrar animación y guardar orderId e items
  const [showAnimation, setShowAnimation] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [completedOrderItems, setCompletedOrderItems] = useState<
    typeof cartState.items
  >([]);
  const [completedUserName, setCompletedUserName] = useState<string>("");

  // Calcular propina
  const calculateTipAmount = () => {
    if (customTip && parseFloat(customTip) > 0) {
      return parseFloat(customTip);
    }
    return (baseAmount * tipPercentage) / 100;
  };

  const tipAmount = calculateTipAmount();

  // Usar el calculador de comisiones centralizado
  const commissions = calculateCommissions(baseAmount, tipAmount);
  const {
    ivaTip,
    subtotalForCommission,
    xquisitoCommissionTotal,
    xquisitoCommissionClient,
    xquisitoCommissionRestaurant,
    ivaXquisitoClient,
    ivaXquisitoRestaurant,
    xquisitoClientCharge,
    xquisitoRestaurantCharge,
    totalAmountCharged: totalAmount,
    rates,
  } = commissions;

  const handleTipPercentage = (percentage: number) => {
    setTipPercentage(percentage);
    setCustomTip("");
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    setTipPercentage(0);
  };

  // Set default payment method when payment methods are loaded
  useEffect(() => {
    // Siempre hay al menos la tarjeta del sistema disponible
    if (!selectedPaymentMethodId && allPaymentMethods.length > 0) {
      const defaultMethod =
        allPaymentMethods.find((pm) => pm.isDefault) || allPaymentMethods[0];
      setSelectedPaymentMethodId(defaultMethod.id);
    }
    // Solo marcar como cargado cuando el carrito también esté listo
    if (!cartState.isLoading) {
      setIsLoadingInitial(false);
    }
  }, [allPaymentMethods.length, selectedPaymentMethodId, cartState.isLoading]);

  const handleInitiatePayment = (): void => {
    if (!tableNumber) {
      alert(
        "No se encontró el número de mesa. Por favor escanea el código QR nuevamente.",
      );
      return;
    }

    if (!selectedPaymentMethodId) {
      alert("Por favor selecciona una tarjeta de pago");
      return;
    }

    // Guardar datos antes de mostrar animación
    setCompletedOrderItems([...cartState.items]);
    const userName = profile?.firstName || cartState.userName || "Usuario";
    setCompletedUserName(userName);

    // Mostrar animación inmediatamente (sin procesar pago aún)
    setShowAnimation(true);
  };

  const handleCancelPayment = () => {
    console.log("❌ Payment cancelled by user");
    setShowAnimation(false);
    setCompletedOrderItems([]);
    setCompletedUserName("");
  };

  const handleConfirmPayment = async (): Promise<void> => {
    // Esta función se ejecuta después de que expira el período de cancelación
    if (!tableNumber || !selectedPaymentMethodId) {
      console.error("Missing required data for payment confirmation");
      setShowAnimation(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Si se seleccionó la tarjeta del sistema, omitir EcartPay y procesar directamente
      if (selectedPaymentMethodId === "system-default-card") {
        console.log(
          "💳 Sistema: Procesando pago con tarjeta del sistema (sin EcartPay)",
        );

        // Continuar con la creación de dish orders directamente
        let customerPhone: string | null = null;

        if (user?.id) {
          try {
            const token = localStorage.getItem("xquisito_access_token");
            const userResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (userResponse.ok) {
              const userResult = await userResponse.json();
              console.log("📞 User data from /auth/me:", userResult);
              if (userResult.success && userResult.data?.profile) {
                customerPhone = userResult.data.profile.phone || null;
                console.log("📞 Extracted customer phone:", customerPhone);
              } else {
                console.warn("⚠️ No profile data in response:", userResult);
              }
            }
          } catch (error) {
            console.warn("Could not fetch user phone:", error);
          }
        }

        // Crear dish orders individuales para cada item del carrito
        const customerName = profile?.firstName
          ? `${profile.firstName}`
          : profile?.firstName || cartState.userName || "Invitado";
        const customerEmail =
          profile?.email || user?.email || `${user?.id}@xquisito.ai`;

        let firstTapOrderId: string | null = null;
        const createdDishOrderIds: string[] = []; // Array para guardar los IDs de dish orders

        console.log("📦 Creating dish orders for all items...");

        const clerkUserId = user?.id
          ? user.id
          : typeof window !== "undefined"
            ? localStorage.getItem("xquisito-guest-id")
            : null;

        if (!cartState.items || cartState.items.length === 0) {
          throw new Error("El carrito está vacío");
        }

        console.log("📦 Cart items to process:", cartState.items);

        for (const item of cartState.items) {
          const images =
            item.images && Array.isArray(item.images) && item.images.length > 0
              ? item.images.filter((img) => img && typeof img === "string")
              : [];

          const customFields =
            item.customFields &&
            Array.isArray(item.customFields) &&
            item.customFields.length > 0
              ? item.customFields
              : null;

          const dishOrderData: any = {
            item: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            clerk_user_id: clerkUserId,
            images: images,
            custom_fields: customFields,
            extra_price: item.extraPrice || 0,
          };

          console.log("Creating dish order:", dishOrderData);

          const dishOrderResult = await tapOrderService.createDishOrder(
            restaurantId,
            branchNumber.toString(),
            tableNumber,
            dishOrderData,
          );

          if (!dishOrderResult.success) {
            console.error("❌ Failed to create dish order:", dishOrderResult);
            throw new Error(
              dishOrderResult.error || "Error al crear el dish order",
            );
          }

          console.log(
            "✅ Dish order created - Full response:",
            dishOrderResult,
          );

          // Extraer y guardar el dish_order_id (estructura: dishOrderResult.data.dish_order_id)
          const dishOrderId = dishOrderResult.data?.dish_order_id || null;

          if (dishOrderId) {
            createdDishOrderIds.push(dishOrderId);
            console.log("✅ Dish order ID saved:", dishOrderId);
          }

          if (!firstTapOrderId) {
            console.log(
              "📝 Attempting to extract tap_order_id from dishOrderResult...",
            );

            // La estructura de respuesta es: { success: true, data: { tap_order_id, dish_order_id, ... } }
            firstTapOrderId = dishOrderResult.data?.tap_order_id || null;

            console.log("📝 Extracted tap_order_id:", firstTapOrderId);

            // Guardar inmediatamente en el estado
            if (firstTapOrderId) {
              setCompletedOrderId(firstTapOrderId);
              console.log("✅ completedOrderId set to:", firstTapOrderId);
            } else {
              console.error("❌ Could not extract tap_order_id from response");
              console.error("❌ dishOrderResult.data:", dishOrderResult.data);
            }
          }
        }

        console.log("✅ All dish orders created. IDs:", createdDishOrderIds);

        // Actualizar payment status y order status
        if (firstTapOrderId) {
          const paymentStatusResult = await tapOrderService.updatePaymentStatus(
            firstTapOrderId,
            "paid",
          );

          if (!paymentStatusResult.success) {
            console.warn(
              "⚠️ Failed to update payment status:",
              paymentStatusResult.error,
            );
          } else {
            console.log("✅ Payment status updated to 'paid'");
          }

          const orderStatusResult = await tapOrderService.updateOrderStatus(
            firstTapOrderId,
            "completed",
          );

          if (!orderStatusResult.success) {
            console.warn(
              "⚠️ Failed to update order status:",
              orderStatusResult.error,
            );
          } else {
            console.log("✅ Order status updated to 'completed'");
          }

          // Marcar todos los dish orders como pagados
          console.log("💰 Marking dish orders as paid...");
          for (const dishOrderId of createdDishOrderIds) {
            try {
              const markPaidResult =
                await tapOrderService.markDishOrderAsPaid(dishOrderId);
              if (markPaidResult.success) {
              } else {
                console.warn(
                  `⚠️ Failed to mark dish order ${dishOrderId} as paid:`,
                  markPaidResult.error,
                );
              }
            } catch (error) {
              console.error(
                `❌ Error marking dish order ${dishOrderId} as paid:`,
                error,
              );
            }
          }

          // Registrar transacción con payment_method_id null para la tarjeta del sistema
          try {
            const xquisitoRateApplied =
              subtotalForCommission > 0
                ? (xquisitoCommissionTotal / subtotalForCommission) * 100
                : 0;

            await tapOrderService.recordPaymentTransaction({
              payment_method_id: null, // null para tarjeta del sistema
              restaurant_id: parseInt(restaurantId),
              id_table_order: null,
              id_tap_orders_and_pay: firstTapOrderId,
              base_amount: baseAmount,
              tip_amount: tipAmount,
              iva_tip: ivaTip,
              xquisito_commission_total: xquisitoCommissionTotal,
              xquisito_commission_client: xquisitoCommissionClient,
              xquisito_commission_restaurant: xquisitoCommissionRestaurant,
              iva_xquisito_client: ivaXquisitoClient,
              iva_xquisito_restaurant: ivaXquisitoRestaurant,
              xquisito_client_charge: xquisitoClientCharge,
              xquisito_restaurant_charge: xquisitoRestaurantCharge,
              xquisito_rate_applied: xquisitoRateApplied,
              total_amount_charged: totalAmount,
              subtotal_for_commission: subtotalForCommission,
              currency: "MXN",
            });
            console.log("✅ Payment transaction recorded successfully");
          } catch (transactionError) {
            console.error(
              "❌ Error recording payment transaction:",
              transactionError,
            );
          }
        }

        // Preparar y guardar detalles del pago para payment-success (tarjeta del sistema)
        const userName = profile?.firstName || cartState.userName || "Usuario";
        const paymentDetailsForSuccess = {
          orderId: firstTapOrderId,
          paymentId: firstTapOrderId,
          transactionId: firstTapOrderId,
          totalAmountCharged: totalAmount,
          amount: totalAmount,
          baseAmount: baseAmount,
          tipAmount: tipAmount,
          xquisitoCommissionClient: xquisitoCommissionClient,
          ivaXquisitoClient: ivaXquisitoClient,
          xquisitoCommissionTotal: xquisitoCommissionTotal,
          userName: userName,
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          cardLast4: "1234",
          cardBrand: "amex",
          orderStatus: "confirmed",
          paymentStatus: "paid",
          createdAt: new Date().toISOString(),
          dishOrders: cartState.items.map((item) => ({
            dish_order_id: item.id || Date.now(),
            item: item.name,
            quantity: item.quantity || 1,
            price: item.price,
            extra_price: item.extraPrice || 0,
            total_price: item.price * (item.quantity || 1),
            guest_name: customerName,
            custom_fields: item.customFields || null,
            images: item.images,
          })),
          restaurantId: parseInt(restaurantId),
          paymentMethodId: null,
          timestamp: Date.now(),
          tableNumber: tableNumber,
        };

        // Guardar en localStorage y sessionStorage
        localStorage.setItem(
          "xquisito-completed-payment",
          JSON.stringify(paymentDetailsForSuccess),
        );

        const uniqueKey = `xquisito-payment-success-${firstTapOrderId}`;
        sessionStorage.setItem(
          uniqueKey,
          JSON.stringify(paymentDetailsForSuccess),
        );

        // Limpiar el carrito después de completar la orden
        await clearCart();
        console.log("🧹 Cart cleared after successful order");

        // Redirigir a payment-success
        console.log(
          "🔀 Redirecting to payment-success with orderId:",
          firstTapOrderId,
        );
        router.push(
          `/${restaurantId}/${branchNumber}/payment-success?orderId=${firstTapOrderId}&success=true&table=${tableNumber}`,
        );
        return;
      }

      // Para tarjetas reales, continuar con el flujo normal de EcartPay
      console.log(
        "💳 Processing payment with EcartPay for user:",
        user?.id || "guest",
      );

      // Paso 1: Procesar pago con endpoint existente
      const paymentData = {
        paymentMethodId: selectedPaymentMethodId!,
        amount: totalAmount,
        currency: "MXN",
        description: `Pago Mesa ${tableNumber} - ${
          profile?.firstName
            ? `${profile.firstName}`
            : profile?.firstName || "Invitado"
        }`,
        orderId: `order-${Date.now()}`,
        tableNumber: tableNumber,
        restaurantId,
      };

      console.log("💳 Processing payment:", paymentData);

      const paymentResult = await paymentService.processPayment(paymentData);

      if (!paymentResult.success) {
        throw new Error(
          paymentResult.error?.message || "Error al procesar el pago",
        );
      }

      console.log("✅ Payment successful:", paymentResult);

      let customerPhone: string | null = null;

      if (user?.id) {
        try {
          const token = localStorage.getItem("xquisito_access_token");
          const userResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (userResponse.ok) {
            const userResult = await userResponse.json();
            console.log("📞 User data from /auth/me:", userResult);
            if (userResult.success && userResult.data?.profile) {
              customerPhone = userResult.data.profile.phone || null;
              console.log("📞 Extracted customer phone:", customerPhone);
            } else {
              console.warn("⚠️ No profile data in response:", userResult);
            }
          }
        } catch (error) {
          console.warn("Could not fetch user phone:", error);
        }
      }

      // Paso 3: Crear dish orders individuales para cada item del carrito
      const customerName = profile?.firstName
        ? `${profile.firstName}`
        : profile?.firstName || cartState.userName || "Invitado";
      const customerEmail =
        profile?.email || user?.email || `${user?.id}@xquisito.ai`;

      let firstTapOrderId: string | null = null;
      const createdDishOrderIds: string[] = []; // Array para guardar los IDs de dish orders

      console.log("📦 Creating dish orders for all items...");

      // Obtener clerk_user_id (puede ser el ID de Clerk o el guest_id)
      const clerkUserId = user?.id
        ? user.id
        : typeof window !== "undefined"
          ? localStorage.getItem("xquisito-guest-id")
          : null;

      // Validar que hay items en el carrito
      if (!cartState.items || cartState.items.length === 0) {
        throw new Error("El carrito está vacío");
      }

      console.log("📦 Cart items to process:", cartState.items);

      // Crear un dish order por cada item del carrito
      for (const item of cartState.items) {
        // Preparar images - filtrar solo strings válidos
        const images =
          item.images && Array.isArray(item.images) && item.images.length > 0
            ? item.images.filter((img) => img && typeof img === "string")
            : [];

        // Preparar custom_fields
        const customFields =
          item.customFields &&
          Array.isArray(item.customFields) &&
          item.customFields.length > 0
            ? item.customFields
            : null;

        const dishOrderData: any = {
          item: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          clerk_user_id: clerkUserId,
          images: images, // Array de strings
          custom_fields: customFields, // JSONB o null
          extra_price: item.extraPrice || 0,
        };

        console.log("Creating dish order:", dishOrderData);

        const dishOrderResult = await tapOrderService.createDishOrder(
          restaurantId,
          branchNumber.toString(),
          tableNumber,
          dishOrderData,
        );

        if (!dishOrderResult.success) {
          console.error("❌ Failed to create dish order:", dishOrderResult);
          throw new Error(
            dishOrderResult.error || "Error al crear el dish order",
          );
        }

        console.log("✅ Dish order created - Full response:", dishOrderResult);
        console.log("✅ Dish order data:", dishOrderResult.data);

        // Extraer y guardar el dish_order_id (estructura: dishOrderResult.data.dish_order_id)
        const dishOrderId = dishOrderResult.data?.dish_order_id || null;

        if (dishOrderId) {
          createdDishOrderIds.push(dishOrderId);
          console.log("✅ Dish order ID saved:", dishOrderId);
        }

        // Guardar el tap_order_id del primer dish order
        // La estructura de respuesta es: { success: true, data: { tap_order_id, dish_order_id, ... } }
        if (!firstTapOrderId) {
          console.log(
            "📝 Attempting to extract tap_order_id from dishOrderResult (saved card)...",
          );

          firstTapOrderId = dishOrderResult.data?.tap_order_id || null;

          console.log("📝 Extracted tap_order_id:", firstTapOrderId);
          console.log(
            "📝 Available properties in dishOrderResult.data:",
            Object.keys(dishOrderResult.data || {}),
          );

          // Guardar inmediatamente en el estado
          if (firstTapOrderId) {
            setCompletedOrderId(firstTapOrderId);
          } else {
            console.error(
              "❌ Could not extract tap_order_id from response (saved card)",
            );
            console.error("❌ dishOrderResult.data:", dishOrderResult.data);
          }
        }
      }

      // Paso 4: Actualizar el payment status y order status
      if (firstTapOrderId) {
        // Actualizar payment status a 'paid'
        const paymentStatusResult = await tapOrderService.updatePaymentStatus(
          firstTapOrderId,
          "paid",
        );

        if (!paymentStatusResult.success) {
          console.warn(
            "⚠️ Failed to update payment status:",
            paymentStatusResult.error,
          );
        } else {
          console.log("✅ Payment status updated to 'paid'");
        }

        // Actualizar order status a 'completed'
        const orderStatusResult = await tapOrderService.updateOrderStatus(
          firstTapOrderId,
          "completed",
        );

        if (!orderStatusResult.success) {
          console.warn(
            "⚠️ Failed to update order status:",
            orderStatusResult.error,
          );
        } else {
          console.log("✅ Order status updated to 'completed'");
        }

        // Marcar todos los dish orders como pagados
        console.log("💰 Marking dish orders as paid...");
        for (const dishOrderId of createdDishOrderIds) {
          try {
            const markPaidResult =
              await tapOrderService.markDishOrderAsPaid(dishOrderId);
            if (markPaidResult.success) {
            } else {
              console.warn(
                `⚠️ Failed to mark dish order ${dishOrderId} as paid:`,
                markPaidResult.error,
              );
            }
          } catch (error) {
            console.error(
              `❌ Error marking dish order ${dishOrderId} as paid:`,
              error,
            );
          }
        }

        // Paso 5: Registrar transacción para trazabilidad
        if (selectedPaymentMethodId) {
          try {
            const xquisitoRateApplied =
              subtotalForCommission > 0
                ? (xquisitoCommissionTotal / subtotalForCommission) * 100
                : 0;

            await tapOrderService.recordPaymentTransaction({
              payment_method_id: selectedPaymentMethodId,
              restaurant_id: parseInt(restaurantId),
              id_table_order: null,
              id_tap_orders_and_pay: firstTapOrderId,
              base_amount: baseAmount,
              tip_amount: tipAmount,
              iva_tip: ivaTip,
              xquisito_commission_total: xquisitoCommissionTotal,
              xquisito_commission_client: xquisitoCommissionClient,
              xquisito_commission_restaurant: xquisitoCommissionRestaurant,
              iva_xquisito_client: ivaXquisitoClient,
              iva_xquisito_restaurant: ivaXquisitoRestaurant,
              xquisito_client_charge: xquisitoClientCharge,
              xquisito_restaurant_charge: xquisitoRestaurantCharge,
              xquisito_rate_applied: xquisitoRateApplied,
              total_amount_charged: totalAmount,
              subtotal_for_commission: subtotalForCommission,
              currency: "MXN",
            });
            console.log("✅ Payment transaction recorded successfully");
          } catch (transactionError) {
            console.error(
              "❌ Error recording payment transaction:",
              transactionError,
            );
            // Don't throw - continue with payment flow even if transaction recording fails
          }
        }
      }

      // Preparar y guardar detalles del pago para payment-success
      // Obtener nombre del usuario (de Supabase si está loggeado, o del estado si es guest)
      const userName = profile?.firstName || cartState.userName || "Usuario";
      const paymentDetailsForSuccess = {
        orderId: firstTapOrderId,
        paymentId: firstTapOrderId,
        transactionId: firstTapOrderId,
        totalAmountCharged: totalAmount,
        amount: totalAmount,
        baseAmount: baseAmount,
        tipAmount: tipAmount,
        xquisitoCommissionClient: xquisitoCommissionClient,
        ivaXquisitoClient: ivaXquisitoClient,
        xquisitoCommissionTotal: xquisitoCommissionTotal,
        userName: userName,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        cardLast4:
          selectedPaymentMethodId === "system-default-card"
            ? "1234"
            : allPaymentMethods.find((pm) => pm.id === selectedPaymentMethodId)
                ?.lastFourDigits || "1234",
        cardBrand:
          selectedPaymentMethodId === "system-default-card"
            ? "visa"
            : allPaymentMethods.find((pm) => pm.id === selectedPaymentMethodId)
                ?.cardBrand || "visa",
        orderStatus: "confirmed",
        paymentStatus: "paid",
        createdAt: new Date().toISOString(),
        dishOrders: cartState.items.map((item) => ({
          dish_order_id: item.id || Date.now(),
          item: item.name,
          quantity: item.quantity || 1,
          price: item.price,
          extra_price: item.extraPrice || 0,
          total_price: item.price * (item.quantity || 1),
          guest_name: customerName,
          custom_fields: item.customFields || null,
        })),
        restaurantId: parseInt(restaurantId),
        paymentMethodId:
          selectedPaymentMethodId === "system-default-card"
            ? null
            : selectedPaymentMethodId,
        timestamp: Date.now(),
        tableNumber: tableNumber,
      };

      // Guardar en localStorage y sessionStorage
      localStorage.setItem(
        "xquisito-completed-payment",
        JSON.stringify(paymentDetailsForSuccess),
      );

      const uniqueKey = `xquisito-payment-success-${firstTapOrderId}`;
      sessionStorage.setItem(
        uniqueKey,
        JSON.stringify(paymentDetailsForSuccess),
      );

      // Limpiar el carrito después de completar la orden
      await clearCart();
      console.log("🧹 Cart cleared after successful order");
    } catch (error) {
      console.error("Payment/Order error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Error: ${errorMessage}`);
      // Si hay error, ocultar la animación
      setShowAnimation(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCard = (): void => {
    navigateWithTable(
      `/add-card?amount=${totalAmount}&baseAmount=${baseAmount}&scan=false`,
    );
  };

  const handleDeleteCard = async (paymentMethodId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) {
      return;
    }

    console.log("🗑️ Attempting to delete payment method:", paymentMethodId);
    console.log("🔍 Current user state:", { user, isAuthenticated });

    setDeletingCardId(paymentMethodId);
    try {
      await deletePaymentMethod(paymentMethodId);
      console.log("✅ Payment method deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting payment method:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Error al eliminar la tarjeta: ${errorMessage}`);
    } finally {
      setDeletingCardId(null);
    }
  };

  // Calcular el total a mostrar según la opción MSI seleccionada
  const getDisplayTotal = () => {
    if (selectedMSI === null) {
      return totalAmount;
    }

    // Obtener el tipo de tarjeta seleccionada
    const selectedMethod = allPaymentMethods.find(
      (pm) => pm.id === selectedPaymentMethodId,
    );
    const cardBrand = selectedMethod?.cardBrand;

    // Configuración de MSI según el tipo de tarjeta
    const msiOptions =
      cardBrand === "amex"
        ? [
            { months: 3, rate: 3.25 },
            { months: 6, rate: 6.25 },
            { months: 9, rate: 8.25 },
            { months: 12, rate: 10.25 },
            { months: 15, rate: 13.25 },
            { months: 18, rate: 15.25 },
            { months: 21, rate: 17.25 },
            { months: 24, rate: 19.25 },
          ]
        : [
            { months: 3, rate: 3.5 },
            { months: 6, rate: 5.5 },
            { months: 9, rate: 8.5 },
            { months: 12, rate: 11.5 },
            { months: 18, rate: 15.0 },
          ];

    // Encontrar la opción seleccionada
    const selectedOption = msiOptions.find((opt) => opt.months === selectedMSI);
    if (!selectedOption) return totalAmount;

    // Calcular comisión e IVA
    const commission = totalAmount * (selectedOption.rate / 100);
    const ivaCommission = commission * 0.16;
    return totalAmount + commission + ivaCommission;
  };

  const displayTotal = getDisplayTotal();

  // Calcular si está bajo el mínimo usando el total con propina, comisiones, etc.
  const isUnderMinimum = totalAmount < MINIMUM_AMOUNT;

  // Mostrar loader mientras valida o carga
  if (isLoadingInitial) {
    return <Loader />;
  }

  // Mostrar error de validación
  if (validationError) {
    return <ValidationError errorType={validationError as any} />;
  }

  return (
    <>
      {/* Animación de orden completada - fuera del contenedor principal para Safari */}
      {showAnimation && (
        <OrderAnimation
          userName={completedUserName}
          orderedItems={completedOrderItems}
          onContinue={() => {
            // Obtener el orderId desde localStorage como respaldo
            const paymentData = localStorage.getItem(
              "xquisito-completed-payment",
            );
            let orderId = completedOrderId;

            if (!orderId && paymentData) {
              try {
                const parsed = JSON.parse(paymentData);
                orderId = parsed.orderId;
              } catch (e) {
                console.error("Error parsing payment data:", e);
              }
            }

            // Redirigir a payment-success
            navigateWithTable(
              `/payment-success?orderId=${orderId || "unknown"}&success=true`,
            );
          }}
          onCancel={handleCancelPayment}
          onConfirm={handleConfirmPayment}
        />
      )}

      <div className="min-h-dvh bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        <MenuHeaderBack />

      <div className="flex-1 flex flex-col justify-end overflow-y-auto">
        <div className="px-4 w-full">
          <div className="flex flex-col relative">
            <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
              <div className="py-6 px-8 flex flex-col justify-center">
                <h1 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
                  Selecciona tu método de pago
                </h1>
              </div>
            </div>

            <div className="bg-white rounded-t-4xl relative z-10 flex flex-col px-8 py-8">
              {/* Resumen del pedido */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                    Subtotal
                  </span>
                  <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                    ${baseAmount.toFixed(2)} MXN
                  </span>
                </div>
              </div>

              {/* Selección de propina */}
              <div className="mb-4">
                {/* Propina label y botones de porcentaje */}
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-black font-medium text-base md:text-lg lg:text-xl whitespace-nowrap">
                    Propina
                  </span>
                  {/* Tip Percentage Buttons */}
                  <div className="grid grid-cols-5 gap-2 flex-1">
                    {[0, 10, 15, 20].map((percentage) => (
                      <button
                        key={percentage}
                        onClick={() => {
                          handleTipPercentage(percentage);
                          setShowCustomTipInput(false);
                        }}
                        className={`py-1 md:py-1.5 lg:py-2 rounded-full border border-[#8e8e8e]/40 text-black transition-colors cursor-pointer ${
                          tipPercentage === percentage && !showCustomTipInput
                            ? "bg-[#eab3f4] text-white"
                            : "bg-[#f9f9f9] hover:border-gray-400"
                        }`}
                      >
                        {percentage === 0 ? "0%" : `${percentage}%`}
                      </button>
                    ))}
                    {/* Custom Tip Button */}
                    <button
                      onClick={() => {
                        setShowCustomTipInput(true);
                        setTipPercentage(0);
                      }}
                      className={`py-1 md:py-1.5 lg:py-2 rounded-full border border-[#8e8e8e]/40 text-black transition-colors cursor-pointer ${
                        showCustomTipInput
                          ? "bg-[#eab3f4] text-white"
                          : "bg-[#f9f9f9] hover:border-gray-400"
                      }`}
                    >
                      $
                    </button>
                  </div>
                </div>

                {/* Custom Tip Input - Solo se muestra cuando showCustomTipInput es true */}
                {showCustomTipInput && (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="relative w-full">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        value={customTip}
                        onChange={(e) => handleCustomTipChange(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        autoFocus
                        className="w-full pl-8 pr-4 py-1 md:py-1.5 lg:py-2 border border-[#8e8e8e]/40 rounded-full focus:outline-none focus:ring focus:ring-gray-400 focus:border-transparent text-black text-center bg-[#f9f9f9] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>
                )}

                {tipAmount > 0 && (
                  <div className="flex justify-end items-center mt-2 text-sm">
                    <span className="text-[#eab3f4] font-medium">
                      +${tipAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}
              </div>

              {/* Alerta de mínimo de compra */}
              {isUnderMinimum && totalAmount > 0 && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 px-6 py-3 -mx-8 rounded-lg">
                  <div className="flex justify-center items-center gap-3">
                    <X className="size-6 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 font-medium text-base md:text-lg">
                      ¡El mínimo de compra es de ${MINIMUM_AMOUNT.toFixed(2)}!
                    </p>
                  </div>
                </div>
              )}

              {/* Comisión e IVA */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center border-t pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      Total a pagar
                    </span>
                    <CircleAlert
                      className="size-4 cursor-pointer text-gray-500"
                      strokeWidth={2.3}
                      onClick={() => setShowTotalModal(true)}
                    />
                  </div>
                  <div className="text-right">
                    {selectedMSI !== null ? (
                      <>
                        <span className="font-medium text-black text-base md:text-lg lg:text-xl">
                          ${(displayTotal / selectedMSI).toFixed(2)} MXN x{" "}
                          {selectedMSI} meses
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-black text-base md:text-lg lg:text-xl">
                        ${displayTotal.toFixed(2)} MXN
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Options - Solo mostrar si es tarjeta de crédito */}
                {(() => {
                  const selectedMethod = allPaymentMethods.find(
                    (pm) => pm.id === selectedPaymentMethodId,
                  );
                  return selectedMethod?.cardType === "credit" ? (
                    <div
                      className="py-2 cursor-pointer"
                      onClick={() => setShowPaymentOptionsModal(true)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-black text-base md:text-lg lg:text-xl">
                          Pago a meses
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedMSI !== null
                              ? "border-[#eab3f4] bg-[#eab3f4]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedMSI !== null && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Métodos de pago guardados - Mostrar siempre (incluye tarjeta del sistema) */}
              <div className="mb-4">
                <h3 className="text-black font-medium mb-3 text-base md:text-lg lg:text-xl">
                  Métodos de pago
                </h3>
                <div className="space-y-2.5">
                  {allPaymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-center py-1.5 px-5 pl-10 border rounded-full transition-colors ${
                        selectedPaymentMethodId === method.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-black/50 bg-[#f9f9f9]"
                      }`}
                    >
                      <div
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className="flex items-center justify-center gap-3 mx-auto cursor-pointer text-base md:text-lg lg:text-xl"
                      >
                        <div>{getCardTypeIcon(method.cardBrand)}</div>
                        <div>
                          <p className="text-black">
                            **** **** **** {method.lastFourDigits}
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`w-4 h-4 rounded-full border-2 cursor-pointer ${
                          selectedPaymentMethodId === method.id
                            ? "border-teal-500 bg-teal-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedPaymentMethodId === method.id && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>

                      {/* Delete Button - No mostrar para tarjeta del sistema */}
                      {method.id !== "system-default-card" && (
                        <button
                          onClick={() => handleDeleteCard(method.id)}
                          disabled={deletingCardId === method.id}
                          className="pl-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Eliminar tarjeta"
                        >
                          {deletingCardId === method.id ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            <Trash2 className="size-5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón agregar tarjeta */}
              <div className="mb-4">
                <button
                  onClick={handleAddCard}
                  className="border border-black/50 flex justify-center items-center gap-1 w-full text-black py-3 rounded-full cursor-pointer transition-colors bg-[#f9f9f9] hover:bg-gray-100 text-base md:text-lg lg:text-xl"
                >
                  <Plus className="size-5 md:size-6 lg:size-7" />
                  Agregar método de pago
                </button>
              </div>

              {/* Botón de pago */}
              <button
                onClick={handleInitiatePayment}
                disabled={
                  isProcessing || !selectedPaymentMethodId || isUnderMinimum
                }
                className={`w-full text-white py-3  rounded-full cursor-pointer transition-all active:scale-90 text-base md:text-lg lg:text-xl ${
                  isProcessing || !selectedPaymentMethodId || isUnderMinimum
                    ? "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#34808C] to-[#173E44]"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 animate-spin" />
                    <span>Procesando pago...</span>
                  </div>
                ) : !selectedPaymentMethodId ? (
                  "Selecciona una tarjeta"
                ) : isUnderMinimum ? (
                  "Mínimo no alcanzado"
                ) : (
                  "Pagar y ordenar"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de resumen del total */}
      {showTotalModal && (
        <div
          className="fixed inset-0 flex items-end justify-center backdrop-blur-sm"
          style={{ zIndex: 99999 }}
        >
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowTotalModal(false)}
          ></div>
          <div className="relative bg-white rounded-t-4xl w-full mx-4 md:mx-6 lg:mx-8">
            <div className="px-6 md:px-8 lg:px-10 pt-4 md:pt-5 lg:pt-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
                <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-black">
                  Resumen del total
                </h3>
                <button
                  onClick={() => setShowTotalModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="px-6 md:px-8 lg:px-10 py-4 md:py-5 lg:py-6">
              <p className="text-black mb-4 text-base md:text-lg lg:text-xl">
                El total se obtiene de la suma de:
              </p>
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                    + Consumo
                  </span>
                  <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                    ${baseAmount.toFixed(2)} MXN
                  </span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      + Propina
                    </span>
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      ${tipAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}
                {xquisitoClientCharge > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      + Comisión de servicio
                    </span>
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      ${xquisitoClientCharge.toFixed(2)} MXN
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de opciones de pago */}
      {showPaymentOptionsModal && (
        <div
          className="fixed inset-0 flex items-end justify-center backdrop-blur-sm"
          style={{ zIndex: 99999 }}
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowPaymentOptionsModal(false)}
          ></div>

          {/* Modal */}
          <div className="relative bg-white rounded-t-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Titulo */}
            <div className="px-6 pt-4 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
                <h3 className="text-lg font-semibold text-black">
                  Opciones de pago
                </h3>
                <button
                  onClick={() => setShowPaymentOptionsModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="px-6 py-4">
              {(() => {
                const selectedMethod = allPaymentMethods.find(
                  (pm) => pm.id === selectedPaymentMethodId,
                );
                const cardBrand = selectedMethod?.cardBrand;

                // Configuración de MSI según el tipo de tarjeta
                const msiOptions =
                  cardBrand === "amex"
                    ? [
                        { months: 3, rate: 3.25, minAmount: 0 },
                        { months: 6, rate: 6.25, minAmount: 0 },
                        { months: 9, rate: 8.25, minAmount: 0 },
                        { months: 12, rate: 10.25, minAmount: 0 },
                        { months: 15, rate: 13.25, minAmount: 0 },
                        { months: 18, rate: 15.25, minAmount: 0 },
                        { months: 21, rate: 17.25, minAmount: 0 },
                        { months: 24, rate: 19.25, minAmount: 0 },
                      ]
                    : [
                        // Visa/Mastercard
                        { months: 3, rate: 3.5, minAmount: 300 },
                        { months: 6, rate: 5.5, minAmount: 600 },
                        { months: 9, rate: 8.5, minAmount: 900 },
                        { months: 12, rate: 11.5, minAmount: 1200 },
                        { months: 18, rate: 15.0, minAmount: 1800 },
                      ];

                return (
                  <div className="space-y-2.5">
                    {/* Opción: Pago completo */}
                    <div
                      onClick={() => setSelectedMSI(null)}
                      className={`py-2 px-5 border rounded-full cursor-pointer transition-colors ${
                        selectedMSI === null
                          ? "border-teal-500 bg-teal-50"
                          : "border-black/50 bg-[#f9f9f9] hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-black text-base md:text-lg">
                            Pago completo
                          </p>
                          <p className="text-xs md:text-sm text-gray-600">
                            ${totalAmount.toFixed(2)} MXN
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedMSI === null
                              ? "border-teal-500 bg-teal-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedMSI === null && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">
                          Pago a meses
                        </span>
                      </div>
                    </div>

                    {/* Opciones MSI */}
                    {(() => {
                      const availableOptions = msiOptions.filter(
                        (option) => totalAmount >= option.minAmount,
                      );
                      const hasUnavailableOptions =
                        availableOptions.length < msiOptions.length;
                      const minAmountNeeded = msiOptions[0]?.minAmount || 0;

                      return (
                        <>
                          {availableOptions.map((option) => {
                            // Calcular comisión e IVA
                            const commission =
                              totalAmount * (option.rate / 100);
                            const ivaCommission = commission * 0.16;
                            const totalWithCommission =
                              totalAmount + commission + ivaCommission;
                            const monthlyPayment =
                              totalWithCommission / option.months;

                            return (
                              <div
                                key={option.months}
                                onClick={() => setSelectedMSI(option.months)}
                                className={`py-2 px-5 border rounded-full cursor-pointer transition-colors ${
                                  selectedMSI === option.months
                                    ? "border-teal-500 bg-teal-50"
                                    : "border-black/50 bg-[#f9f9f9] hover:border-gray-400"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-black text-base md:text-lg">
                                      ${monthlyPayment.toFixed(2)} MXN x{" "}
                                      {option.months} meses
                                    </p>
                                    <p className="text-xs md:text-sm text-gray-600">
                                      Total ${totalWithCommission.toFixed(2)}{" "}
                                      MXN
                                    </p>
                                  </div>
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      selectedMSI === option.months
                                        ? "border-teal-500 bg-teal-500"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    {selectedMSI === option.months && (
                                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {hasUnavailableOptions &&
                            totalAmount < minAmountNeeded && (
                              <p className="text-xs md:text-sm text-gray-500 text-center mt-2">
                                Monto mínimo ${minAmountNeeded.toFixed(2)} MXN
                                para pagos a meses
                              </p>
                            )}
                        </>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Footer con botón de confirmar */}
            <div className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowPaymentOptionsModal(false)}
                className="w-full bg-gradient-to-r from-[#34808C] to-[#173E44] text-white py-3 rounded-full cursor-pointer transition-colors text-base"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
