"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
} from "react";
import { MenuItemData } from "../interfaces/menuItemData";

// Importar tipos
import { TapOrder } from "@/services/api/tap-order.service";

// Interfaz para un item del carrito (mantiene la misma funcionalidad)
export interface CartItem extends MenuItemData {
  quantity: number;
  customFields?: {
    fieldId: string;
    fieldName: string;
    selectedOptions: Array<{
      optionId: string;
      optionName: string;
      price: number;
    }>;
  }[];
  extraPrice?: number;
}

// Estado de la mesa con tap-orders
interface TableState {
  tableNumber: string;
  tapOrders: TapOrder[];
  currentUserName: string;
  currentUserItems: CartItem[];
  currentUserTotalItems: number;
  currentUserTotalPrice: number;
  isLoading: boolean;
  error: string | null;
}

// Acciones para el sistema de tap-orders
type TableAction =
  | { type: "SET_TABLE_NUMBER"; payload: string }
  | { type: "ADD_ITEM_TO_CURRENT_USER"; payload: MenuItemData }
  | { type: "REMOVE_ITEM_FROM_CURRENT_USER"; payload: number }
  | {
      type: "UPDATE_QUANTITY_CURRENT_USER";
      payload: {
        id: number;
        quantity: number;
        customFields?: CartItem["customFields"];
      };
    }
  | { type: "SET_CURRENT_USER_NAME"; payload: string }
  | { type: "CLEAR_CURRENT_USER_CART" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_TAP_ORDERS"; payload: TapOrder[] };

// Estado inicial
const initialState: TableState = {
  tableNumber: "",
  tapOrders: [],
  currentUserName: "",
  currentUserItems: [],
  currentUserTotalItems: 0,
  currentUserTotalPrice: 0,
  isLoading: false,
  error: null,
};

// Función para calcular totales (incluye extraPrice)
const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + (item.price + (item.extraPrice || 0)) * item.quantity,
    0
  );
  return { totalItems, totalPrice };
};

// Nuevo reducer para el sistema de platillos
function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case "SET_TABLE_NUMBER":
      return {
        ...state,
        tableNumber: action.payload,
      };

    // Mantener la funcionalidad del carrito (con comparación de custom fields)
    case "ADD_ITEM_TO_CURRENT_USER": {
      // Función helper para comparar custom fields
      const areCustomFieldsEqual = (
        cf1?: CartItem["customFields"],
        cf2?: CartItem["customFields"]
      ) => {
        if (!cf1 && !cf2) return true;
        if (!cf1 || !cf2) return false;
        if (cf1.length !== cf2.length) return false;

        return cf1.every((field1, index) => {
          const field2 = cf2[index];
          if (field1.fieldId !== field2.fieldId) return false;
          if (field1.selectedOptions.length !== field2.selectedOptions.length)
            return false;

          return field1.selectedOptions.every((opt1, idx) => {
            const opt2 = field2.selectedOptions[idx];
            return opt1.optionId === opt2.optionId;
          });
        });
      };

      const existingItem = state.currentUserItems.find(
        (item) =>
          item.id === action.payload.id &&
          areCustomFieldsEqual(item.customFields, action.payload.customFields)
      );

      let newItems: CartItem[];
      if (existingItem) {
        newItems = state.currentUserItems.map((item) =>
          item.id === action.payload.id &&
          areCustomFieldsEqual(item.customFields, action.payload.customFields)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [
          ...state.currentUserItems,
          { ...action.payload, quantity: 1 },
        ];
      }

      const { totalItems, totalPrice } = calculateTotals(newItems);

      return {
        ...state,
        currentUserItems: newItems,
        currentUserTotalItems: totalItems,
        currentUserTotalPrice: totalPrice,
      };
    }

    case "REMOVE_ITEM_FROM_CURRENT_USER": {
      const newItems = state.currentUserItems.filter(
        (item) => item.id !== action.payload
      );
      const { totalItems, totalPrice } = calculateTotals(newItems);

      return {
        ...state,
        currentUserItems: newItems,
        currentUserTotalItems: totalItems,
        currentUserTotalPrice: totalPrice,
      };
    }

    case "UPDATE_QUANTITY_CURRENT_USER": {
      // Función helper para comparar custom fields (reutilizada)
      const areCustomFieldsEqual = (
        cf1?: CartItem["customFields"],
        cf2?: CartItem["customFields"]
      ) => {
        if (!cf1 && !cf2) return true;
        if (!cf1 || !cf2) return false;
        if (cf1.length !== cf2.length) return false;

        return cf1.every((field1, index) => {
          const field2 = cf2[index];
          if (field1.fieldId !== field2.fieldId) return false;
          if (field1.selectedOptions.length !== field2.selectedOptions.length)
            return false;

          return field1.selectedOptions.every((opt1, idx) => {
            const opt2 = field2.selectedOptions[idx];
            return opt1.optionId === opt2.optionId;
          });
        });
      };

      const newItems = state.currentUserItems
        .map((item) =>
          item.id === action.payload.id &&
          areCustomFieldsEqual(item.customFields, action.payload.customFields)
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter((item) => item.quantity > 0);

      const { totalItems, totalPrice } = calculateTotals(newItems);

      return {
        ...state,
        currentUserItems: newItems,
        currentUserTotalItems: totalItems,
        currentUserTotalPrice: totalPrice,
      };
    }

    case "SET_CURRENT_USER_NAME":
      return {
        ...state,
        currentUserName: action.payload,
      };

    case "CLEAR_CURRENT_USER_CART":
      return {
        ...state,
        currentUserItems: [],
        currentUserTotalItems: 0,
        currentUserTotalPrice: 0,
      };

    // Acciones para tap-orders
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case "SET_TAP_ORDERS":
      return {
        ...state,
        tapOrders: Array.isArray(action.payload) ? action.payload : [],
        isLoading: false,
        error: null,
      };

    default:
      return state;
  }
}

// Contexto de la mesa
const TableContext = createContext<{
  state: TableState;
  dispatch: React.Dispatch<TableAction>;
} | null>(null);

// Provider del contexto de mesa
export function TableProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tableReducer, initialState);

  return (
    <TableContext.Provider
      value={{
        state,
        dispatch,
      }}
    >
      {children}
    </TableContext.Provider>
  );
}

// Hook personalizado para usar el contexto de mesa
export function useTable() {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
}
