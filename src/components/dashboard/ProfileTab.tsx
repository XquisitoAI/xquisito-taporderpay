"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { User, Camera, Loader2, Phone, X, LogOut, LogIn } from "lucide-react";

export default function ProfileTab() {
  const { user, profile, isAuthenticated, isLoading, updateProfile, logout } =
    useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // Formatear número de teléfono
  const formatPhoneNumber = (phoneNumber: any) => {
    if (!phoneNumber) return "";

    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Código de país (ej: +52)
    if (cleaned.length > 10) {
      const countryCode = cleaned.slice(0, cleaned.length - 10);
      const areaCode = cleaned.slice(-10, -7);
      const firstPart = cleaned.slice(-7, -4);
      const lastPart = cleaned.slice(-4);
      return `+${countryCode} ${areaCode} ${firstPart} ${lastPart}`;
    }

    return phoneNumber;
  };

  // Load profile data from AuthContext
  useEffect(() => {
    const loadUserData = async () => {
      if (!profile || isLoading) return;

      try {
        setIsLoadingData(true);

        // Load data from profile
        setFirstName(profile.firstName || "");
        setLastName(profile.lastName || "");
        setPhone(profile.phone || "");
        setBirthDate(profile.birthDate || "");
        setGender(profile.gender || "");
      } catch (error) {
        console.error("❌ Error loading user data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadUserData();
  }, [profile, isLoading]);

  const handleUpdateProfile = async () => {
    if (!profile) return;

    setIsUpdating(true);
    try {
      const profileData = {
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        gender: gender as "male" | "female" | "other" | undefined,
        // Convert age to birth date
        birthDate: birthDate,
      };

      const response = await updateProfile(profileData);

      if (response.success) {
        alert("Perfil actualizado correctamente");
      } else {
        throw new Error("Error al actualizar el perfil");
      }
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      alert("Error al actualizar el perfil");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5MB");
      return;
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      alert("Solo se permiten archivos de imagen");
      return;
    }

    setIsUpdating(true);

    try {
      // TODO: Implement photo upload with new backend
      console.log("Photo upload not yet implemented with new auth system");
      alert("Funcionalidad de foto no disponible aún");
    } catch (error) {
      console.error("Error al actualizar la foto:", error);
      alert("Error al actualizar la foto");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !profile || isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12 md:py-16 lg:py-20">
        <Loader2 className="size-8 md:size-10 lg:size-12 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Profile Image */}
      <div className="flex flex-col items-center">
        <div className="relative group mb-4">
          <div className="size-28 md:size-32 lg:size-36 rounded-full bg-gray-200 overflow-hidden border-2 md:border-4 border-teal-600">
            <img
              src={profile.photoUrl || "/default-avatar.png"}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          {isAuthenticated && (
            <label
              htmlFor="profile-image"
              className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 md:p-2.5 lg:p-3 rounded-full cursor-pointer hover:bg-teal-700 transition-colors"
            >
              <Camera className="size-4 md:size-5 lg:size-6" />
              <input
                id="profile-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUpdating}
              />
            </label>
          )}
        </div>
      </div>

      {/* Email or Phone */}
      <div className="space-y-2 mb-4 md:mb-5 lg:mb-6">
        <label className="gap-1.5 md:gap-2 flex items-center text-sm md:text-base lg:text-lg text-gray-700">
          <Phone className="size-3.5 md:size-4 lg:size-5" />
          Teléfono
        </label>
        <div className="w-full px-4 md:px-5 lg:px-6 py-3 md:py-4 lg:py-5 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 text-base md:text-lg lg:text-xl">
          {formatPhoneNumber(profile.phone) || "No disponible"}
        </div>
      </div>

      <div className="flex gap-3 md:gap-4 lg:gap-5 mb-4 md:mb-5 lg:mb-6">
        {/* Nombre */}
        <div className="space-y-2 flex-1">
          <label className="gap-1.5 md:gap-2 flex items-center text-sm md:text-base lg:text-lg text-gray-700">
            <User className="size-3.5 md:size-4 lg:size-5" />
            Nombre
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full px-4 md:px-5 lg:px-6 py-3 md:py-4 lg:py-5 border text-black text-base md:text-lg lg:text-xl border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isUpdating || !isAuthenticated}
          />
        </div>

        {/* Apellido */}
        <div className="space-y-2 flex-1">
          <label className="gap-1.5 md:gap-2 flex items-center text-sm md:text-base lg:text-lg text-gray-700">
            <User className="size-3.5 md:size-4 lg:size-5" />
            Apellido
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Tu apellido"
            className="w-full px-4 md:px-5 lg:px-6 py-3 md:py-4 lg:py-5 border text-black text-base md:text-lg lg:text-xl border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isUpdating || !isAuthenticated}
          />
        </div>
      </div>

      <div className="flex gap-3 md:gap-4 lg:gap-5 mb-6 md:mb-8 lg:mb-10">
        {/* Fecha de nacimiento */}
        <div className="space-y-2 flex-1 min-w-0">
          <label className="gap-1.5 md:gap-2 flex items-center text-sm md:text-base lg:text-lg text-gray-700">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            placeholder="dd/mm/aaaa"
            className="cursor-pointer w-full px-2 md:px-5 lg:px-6 py-3 md:py-4 lg:py-5 border text-black text-base md:text-lg lg:text-xl border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            disabled={isUpdating || !isAuthenticated}
            lang="es-MX"
          />
        </div>

        {/* Genero */}
        <div className="space-y-2 flex-1 min-w-0">
          <label className="gap-1.5 md:gap-2 flex items-center text-sm md:text-base lg:text-lg text-gray-700">
            Género
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="cursor-pointer w-full px-2 md:px-5 lg:px-6 py-3 md:py-4 lg:py-5 border text-black text-base md:text-lg lg:text-xl border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isUpdating || !isAuthenticated}
          >
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      {/* Logout/Login */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className={`font-medium text-sm md:text-base lg:text-lg flex items-center gap-2 cursor-pointer ${
            isAuthenticated
              ? "text-red-600 hover:text-red-700"
              : "text-teal-600 hover:text-teal-700"
          }`}
        >
          {isAuthenticated ? (
            <>
              <LogOut className="size-4 md:size-5 lg:size-6" />
              Cerrar sesión
            </>
          ) : (
            <>
              <LogIn className="size-4 md:size-5 lg:size-6" />
              Iniciar sesión
            </>
          )}
        </button>
      </div>

      {/* Update Button */}
      {isAuthenticated && (
        <button
          onClick={handleUpdateProfile}
          disabled={isUpdating}
          className="mt-6 md:mt-8 lg:mt-10 bg-black hover:bg-stone-950 w-full text-white py-3 md:py-4 lg:py-5 text-base md:text-lg lg:text-xl rounded-full cursor-pointer transition-colors disabled:bg-stone-600 disabled:cursor-not-allowed"
        >
          {isUpdating ? (
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <Loader2 className="size-5 md:size-6 lg:size-7 animate-spin" />
              Actualizando...
            </div>
          ) : (
            "Guardar cambios"
          )}
        </button>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsLogoutModalOpen(false)}
          ></div>

          <div className="relative bg-white rounded-t-4xl w-full mx-4 p-6 md:p-7 lg:p-8">
            {/* Close Button */}
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute top-4 md:top-5 lg:top-6 right-4 md:right-5 lg:right-6 text-gray-400 hover:text-gray-600"
            >
              <X className="size-5 md:size-6 lg:size-7" />
            </button>

            {/* Modal Title */}
            <h3 className="text-base md:text-xl lg:text-2xl font-semibold text-gray-800 mb-4 md:mb-5">
              Cerrar sesión
            </h3>

            {/* Confirmation Message */}
            <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">
              ¿Estás seguro de que deseas cerrar sesión?
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 md:py-3 text-base md:text-lg rounded-full cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 md:py-3 text-base md:text-lg rounded-full cursor-pointer transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
