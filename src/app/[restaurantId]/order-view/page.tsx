"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { useRestaurant } from "@/context/RestaurantContext";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import { Loader2, RefreshCw } from "lucide-react";
import { apiService, TapOrder } from "@/utils/api2";

export default function OrderViewPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<TapOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { navigateWithTable } = useTableNavigation();

  // Función para cargar la orden
  const fetchOrder = async (isRefresh = false) => {
    if (!orderId) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await apiService.getOrderById(orderId);

      if (result.success && result.data) {
        const orderData = result.data?.data || result.data;
        setOrder(orderData);
        console.log("Order loaded:", orderData);
      } else {
        setError(result.error?.message || "Error al cargar la orden");
      }
    } catch (err) {
      setError("Error de red al cargar la orden");
      console.error("Error fetching order:", err);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Cargar orden si se proporciona orderId
  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleRefresh = () => {
    fetchOrder(true);
  };

  const handleContinue = () => {
    // Los datos ya fueron guardados en card-selection, solo navegar de vuelta
    navigateWithTable(`/payment-success?orderId=${orderId}&success=true`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "ready":
        return "bg-green-100 text-green-800 border-green-300";
      case "delivered":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Función para obtener el texto del status
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En progreso";
      case "ready":
        return "Listo";
      case "delivered":
        return "Entregado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack />
      <div className="px-4 md:px-6 lg:px-8 w-full flex-1 flex flex-col">
        <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 md:py-8 lg:py-10 px-8 md:px-10 lg:px-12 flex flex-col justify-center">
            <h1 className="font-medium text-white text-3xl md:text-4xl lg:text-5xl leading-7 md:leading-9 lg:leading-tight mt-2 md:mt-3 mb-6 md:mb-8">
              {success ? "¡Orden confirmada!" : "Tu orden"}
            </h1>
          </div>
        </div>
        <div className="flex-1 h-full flex flex-col overflow-hidden">
          {/* Contenido con scroll */}
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-6 md:px-8 lg:px-10 overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col pb-[120px] md:pb-[140px] lg:pb-[160px] pt-6 md:pt-8 lg:pt-10">
              {/* Título con botón de refresh */}
              <div className="flex justify-center items-start mb-4 md:mb-5 lg:mb-6 relative">
                <h2 className="bg-[#f9f9f9] border border-[#8e8e8e] rounded-full px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 text-base md:text-lg lg:text-xl font-medium text-black">
                  Items ordenados
                </h2>
                <div className="absolute right-0">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`size-5 md:size-6 lg:size-7 text-[#0a8b9b] ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12 md:py-16 lg:py-20">
                  <Loader2 className="size-8 md:size-10 lg:size-12 animate-spin text-[#0a8b9b]" />
                </div>
              ) : error ? (
                <div className="text-center py-8 md:py-10 lg:py-12">
                  <p className="text-red-500 text-base md:text-lg lg:text-xl">{error}</p>
                </div>
              ) : order ? (
                <>
                  {/* Items de la orden */}
                  <div className="divide-y divide-gray-200">
                    {order?.dishes?.map((dish, index) => (
                      <div
                        key={dish.id || index}
                        className="py-3 md:py-4 lg:py-5 flex items-start gap-3 md:gap-4 lg:gap-5"
                      >
                        <div className="flex-shrink-0">
                          <div className="size-16 md:size-20 lg:size-24 bg-gray-300 rounded-sm flex items-center justify-center">
                            {dish.images &&
                            dish.images.length > 0 &&
                            dish.images[0] ? (
                              <img
                                src={dish.images[0]}
                                alt={dish.item}
                                className="w-full h-full object-cover rounded-sm"
                              />
                            ) : (
                              <img
                                src={"/logos/logo-short-green.webp"}
                                alt="Logo Xquisito"
                                className="size-18 object-contain"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg lg:text-xl text-black capitalize">
                            {dish.item}
                          </h3>

                          {dish.custom_fields &&
                            dish.custom_fields.length > 0 && (
                              <div className="text-xs md:text-sm lg:text-base text-gray-400 space-y-0.5 mt-1 md:mt-1.5 lg:mt-2">
                                {dish.custom_fields.map(
                                  (field: any, idx: number) => (
                                    <div key={idx}>
                                      {field.selectedOptions
                                        ?.filter((opt: any) => opt.price > 0)
                                        .map((opt: any, optIdx: number) => (
                                          <p key={optIdx}>
                                            {opt.optionName} $
                                            {opt.price.toFixed(2)}
                                          </p>
                                        ))}
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                          {/* Badge de estado */}
                          <div className="mt-1 md:mt-1.5 lg:mt-2">
                            <span
                              className={`inline-block px-2 md:px-3 lg:px-4 py-0.5 md:py-1 lg:py-1.5 text-xs md:text-sm lg:text-base font-medium rounded-full border ${getStatusColor(dish.status)}`}
                            >
                              {getStatusText(dish.status)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="text-xs md:text-sm lg:text-base text-gray-500">
                            Cant: {dish.quantity}
                          </p>
                          <p className="text-base md:text-lg lg:text-xl text-black">
                            ${dish.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumen de totales */}
                  {/*
                  <div className="border-t border-gray-300 pt-4 mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total platillos</span>
                      <span className="text-black font-medium">
                        {order?.summary?.total_dishes}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total items</span>
                      <span className="text-black font-medium">
                        {order?.summary?.total_items}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-300">
                      <span className="text-black">Total</span>
                      <span className="text-black">
                        ${order?.tap_order?.total_amount.toFixed(2)} MXN
                      </span>
                    </div>
                  </div>*/}
                </>
              ) : (
                <div className="text-center py-8 md:py-10 lg:py-12">
                  <p className="text-gray-500 text-base md:text-lg lg:text-xl">
                    No se encontró información de la orden
                  </p>
                </div>
              )}
            </div>{" "}
            {/* Cierra flex-1 overflow-y-auto */}
            {/* Botón fijado en la parte inferior */}
            <div className="fixed bottom-0 left-0 right-0 mx-4 md:mx-6 lg:mx-8 px-6 md:px-8 lg:px-10 z-10">
              <div className="w-full flex gap-3 md:gap-4 lg:gap-5 justify-center pb-6 md:pb-8 lg:pb-10">
                <button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-[#34808C] to-[#173E44] text-white text-base md:text-lg lg:text-xl py-3 md:py-4 lg:py-5 rounded-full cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>{" "}
          {/* Cierra bg-white rounded-t-4xl */}
        </div>{" "}
        {/* Cierra flex-1 h-full */}
      </div>{" "}
      {/* Cierra px-4 w-full flex-1 */}
    </div>
  );
}
