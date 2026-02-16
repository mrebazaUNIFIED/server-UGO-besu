import { FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "flowbite-react";

export const UserCard = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        signOut();
        navigate("/login");
    };


    if (!user) {
        return null;
    }
    
    const initial = user.role === "admin" ? "S" : "F";

    return (
        <div className="flex items-center justify-around bg-[var(--gris-claro)] rounded-lg p-3 shadow-sm border border-gray-200">
            {/* Avatar con inicial */}
            <div className="flex items-center justify-center space-x-3 py-3">
                <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg text-white
                    ${user.role === "admin" ? "bg-[var(--gris-oscuro)]" : "bg-[var(--rojo)]"}`}
                >
                    {initial}
                </div>
            </div>

            <div className="text-center">
                <p className="text-lg text-gray-500 capitalize">
                    {user.name}
                </p>
            </div>

            {/* Logout */}
            <Tooltip content="Logout" placement="right" style="light">
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center text-[var(--rojo-oscuro)] hover:text-red-500 p-2 rounded-full transition-colors duration-200 cursor-pointer"
                >
                    <FaSignOutAlt className="h-5 w-5" />
                </button>
            </Tooltip>
        </div>
    );
};