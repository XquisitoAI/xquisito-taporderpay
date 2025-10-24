"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function MenuHeaderBack() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <header className="container mx-auto px-5 pt-5 z-10">
      <div className="relative flex items-center justify-between z-10">
        {/* Back */}
        <div className="flex items-center z-10">
          <div
            onClick={handleBack}
            className="size-10 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="text-primary" />
          </div>
        </div>

        {/* Xquisito Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 size-10">
          <img src="/logos/logo-short-green.webp" alt="Xquisito Logo" />
        </div>

        {/* Espacio para mantener el layout */}
        <div className="w-10"></div>
      </div>
    </header>
  );
}
