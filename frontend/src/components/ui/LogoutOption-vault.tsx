import { FaSignOutAlt } from "react-icons/fa";
import { Tooltip } from "flowbite-react";
import { useVaultAuth } from "../../hooks/useVaultAuth";

export const UserCardVault = () => {
  const { vaultUser, logout } = useVaultAuth();

  if (!vaultUser) return null; // Evita render si no hay usuario

  const handleLogout = () => {
    logout();
  };

  // Inicial del nombre
  const initial = vaultUser.firstName ? vaultUser.firstName.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex items-center justify-between bg-[#0280CC20] rounded-lg p-3 shadow-sm border border-[#0280CC33]">
      {/* Avatar con inicial */}
      <div className="flex items-center space-x-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg text-white"
          style={{ backgroundColor: "#0280CC" }}
        >
          {initial}
        </div>
        <div className="text-left">
          <p className="text-lg text-white capitalize">{vaultUser.firstName}</p>
          <p className="text-sm text-gray-500">{vaultUser.email}</p>
        </div>
      </div>

      {/* Logout */}
      <Tooltip content="Logout" placement="right" style="light">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center p-2 rounded-full transition-colors duration-200 cursor-pointer"
          style={{ color: "#0280CC" }}
        >
          <FaSignOutAlt className="h-5 w-5" />
        </button>
      </Tooltip>
    </div>
  );
};
