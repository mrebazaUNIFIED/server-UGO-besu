import React from "react";
import fciLogo from "../../../assets/vault-logo.png";

export const Footer = () => {
  return (
    <footer className="bg-[#1f252b] text-white py-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 items-start">

          {/* Logo */}
          <div className="flex justify-center md:justify-start">
            <img
              src={fciLogo}
              alt="FCI"
              className="w-28 object-contain"
            />
          </div>

          {/* Column 1 */}
          <div className="text-center md:text-left space-y-2 text-lg">
            <p className="hover:text-gray-300 cursor-pointer">GOVERNANCE</p>
            <p className="hover:text-gray-300 cursor-pointer">ABOUT US</p>
            <a href="/terms" className="text-gray-400 text-sm hover:text-gray-500">TERMS OF USE</a>
          </div>

          {/* Column 2 */}
          <div className="text-center md:text-left space-y-2 text-lg">
            <p className="hover:text-gray-300 cursor-pointer">DOCS</p>
            <p className="hover:text-gray-300 cursor-pointer">TECHNICAL PAPER</p>
            <a href="/privacy" className="text-gray-400 text-sm hover:text-gray-500">PRIVACY POLICY</a>
          </div>

          {/* Column 3 */}
          <div className="text-center md:text-left space-y-2 text-lg">
            <p className="hover:text-gray-300 cursor-pointer">FAQS</p>
            <p className="hover:text-gray-300 cursor-pointer">CONTACT</p>
          </div>

        </div>

        {/* Bottom section */}
        <div className="text-center mt-16 text-gray-300 text-sm">
          <p>Copyright © FCI BLOCKCHAIN 2026</p>
          <p className="text-gray-400 mt-1">v1.24.05.22.1</p>
        </div>

      </div>
    </footer>
  );
};