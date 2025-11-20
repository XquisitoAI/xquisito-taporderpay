"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Loader from "./UI/Loader";
import ProfileTab from "./dashboard/ProfileTab";
import CardsTab from "./dashboard/CardsTab";
import HistoryTab from "./dashboard/HistoryTab";
import SupportTab from "./dashboard/SupportTab";
import DashboardHeader from "./headers/DashboardHeader";

export default function DashboardView() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "cards" | "history" | "support"
  >("profile");

  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Loading state
  if (!isLoaded) {
    return <Loader />;
  }

  // Not authenticated (shouldn't happen but good fallback)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-medium text-white mb-4">
            Acceso denegado
          </h1>
          <p className="text-white mb-6">
            Inicia sesión para acceder a tu perfil
          </p>
          <button
            onClick={() => router.push("/sign-in")}
            className="bg-black hover:bg-stone-950 text-white px-6 py-3 rounded-full cursor-pointer transition-colors"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <DashboardHeader />

      <div className="px-4 md:px-6 lg:px-8 w-full flex-1 flex flex-col">
        {/* Welcome Header */}
        <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 md:py-8 lg:py-10 px-8 md:px-10 lg:px-12 flex flex-col justify-center pb-12 md:pb-14 lg:pb-16">
            <h1 className="text-white text-2xl md:text-3xl lg:text-4xl font-medium">
              ¡Bienvenido{user?.firstName ? ` ${user.firstName}` : ""}!
            </h1>
          </div>
        </div>

        <div className="flex-1 h-full flex flex-col overflow-hidden">
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-6 md:px-7 lg:px-8">
            {/* Tabs */}
            <div className="grid grid-cols-4 gap-2 my-6 md:my-7 lg:my-8 w-full">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-3 md:px-4 lg:px-5 py-0.5 md:py-1 lg:py-1.5 rounded-full cursor-pointer whitespace-nowrap text-base md:text-lg lg:text-xl ${
                  activeTab === "profile"
                    ? "bg-black text-white hover:bg-slate-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Perfil
              </button>
              <button
                onClick={() => setActiveTab("support")}
                className={`px-3 md:px-4 lg:px-5 py-0.5 md:py-1 lg:py-1.5 rounded-full cursor-pointer whitespace-nowrap text-base md:text-lg lg:text-xl ${
                  activeTab === "support"
                    ? "bg-black text-white hover:bg-slate-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Soporte
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 md:px-4 lg:px-5 py-0.5 md:py-1 lg:py-1.5 rounded-full cursor-pointer whitespace-nowrap text-base md:text-lg lg:text-xl ${
                  activeTab === "history"
                    ? "bg-black text-white hover:bg-slate-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Historial
              </button>

              <button
                onClick={() => setActiveTab("cards")}
                className={`px-3 md:px-4 lg:px-5 py-0.5 md:py-1 lg:py-1.5 rounded-full cursor-pointer whitespace-nowrap text-base md:text-lg lg:text-xl ${
                  activeTab === "cards"
                    ? "bg-black text-white hover:bg-slate-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Tarjetas
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col overflow-y-auto pb-6">
              {activeTab === "profile" && <ProfileTab />}
              {activeTab === "cards" && <CardsTab />}
              {activeTab === "history" && <HistoryTab />}
              {activeTab === "support" && <SupportTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
