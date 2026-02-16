import { useState } from "react";
import { FaSearch, FaChevronDown, FaUser, FaSignOutAlt } from "react-icons/fa";
import { motion } from "motion/react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export const Header = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleLogout = () => {
        signOut();
        setIsUserMenuOpen(false); // Close the menu after logout
        navigate("/login"); // Redirect to login page
    };

    return (
        <header className="w-full bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 shadow-md p-4 md:p-6 flex items-center justify-between relative">
            {/* Title or Section Name */}
            <div className="text-2xl font-bold text-gray-800 md:block hidden tracking-wide">Overview</div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-gray-700 focus:outline-none cursor-pointer hover:text-gray-900 transition-colors"
                >
                    <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 6h16M4 12h16m-7 6h7"
                        />
                    </svg>
                </button>
            </div>

            {/* Desktop Actions */}
            <div className="flex items-center space-x-6">
               
                <div className="relative flex items-center space-x-3">
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center space-x-3 focus:outline-none cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-all"
                    >
                        <img
                            src="https://assets.aceternity.com/manu.png"
                            alt="User Avatar"
                            className="h-10 w-10 rounded-full border-2 border-gray-200"
                        />
                        <div className="flex items-center space-x-1">
                            <span className="text-base font-semibold text-gray-800 md:block hidden">
                                {user?.userId || "Zola M."}
                            </span>
                            <motion.div
                                whileTap={{ rotate: 180 }}
                                className="text-gray-600"
                            >
                                <FaChevronDown className="h-5 w-5" />
                            </motion.div>
                        </div>
                    </button>
                    {/* User Dropdown */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: isUserMenuOpen ? 1 : 0, scale: isUserMenuOpen ? 1 : 0.9, y: isUserMenuOpen ? 0 : -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 md:block hidden"
                    >
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-gray-100 rounded-xl flex items-center space-x-3 transition-colors duration-200 cursor-pointer"
                        >
                            <FaSignOutAlt className="h-5 w-5 text-red-500" />
                            <span>Logout</span>
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Mobile Menu (Dropdown) */}
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: isMobileMenuOpen ? 1 : 0, height: isMobileMenuOpen ? "auto" : 0 }}
                className="md:hidden absolute top-16 right-4 bg-white border border-gray-200 rounded-xl p-3 shadow-lg z-20"
            >
              
                <div className="relative mt-2">
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-3 cursor-pointer"
                    >
                        <img
                            src="https://assets.aceternity.com/manu.png"
                            alt="User Avatar"
                            className="h-8 w-8 rounded-full border-2 border-gray-200"
                        />
                        <span>{user?.userId || "Zola M."}</span>
                    </button>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: isUserMenuOpen ? 1 : 0, scale: isUserMenuOpen ? 1 : 0.9, y: isUserMenuOpen ? 0 : -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-0 left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                    >
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-gray-100 rounded-xl flex items-center space-x-3 transition-colors duration-200 cursor-pointer"
                        >
                            <FaSignOutAlt className="h-5 w-5 text-red-500" />
                            <span>Logout</span>
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </header>
    );
};