import { useState } from "react";
import { Sidebar, SidebarBody } from "../components/ui/sidebar";
import { cn } from "../lib/utils";
import { Outlet } from "react-router-dom";
import VaultLogo from "../assets/vault-logo.png";
import { IoHomeOutline } from "react-icons/io5";
import { TbChartHistogram } from "react-icons/tb";
import React from "react";
import { UserCardVault } from "../components/ui/LogoutOption-vault";
import { CiSearch } from "react-icons/ci";
import {  Share2 } from "lucide-react";
import { TbBuildingStore } from "react-icons/tb";

export function VaultDashboardPage() {
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Vault",
      href: "/vaulting",
      icon: <IoHomeOutline className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Vault Explorer",
      href: "/vaulting/explorer",
      icon: <CiSearch className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Marketplace Explorer",
      href: "/vaulting/marketplace",
      icon: <TbBuildingStore className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Wallet - Portafolio Certificate",
      href: "/vaulting/portafolio-wallet",
      icon: <TbChartHistogram className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Shared Loans",
      href: "/vaulting/my-shared",
      icon: <Share2 className="h-5 w-5 shrink-0" />,
    },
  ];

  return (
    <div
      className={cn(
        "w-screen h-screen flex-1 overflow-hidden bg-gray-50",
        "md:flex md:flex-row"
      )}
    >
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} animate={false}>
        <SidebarBody className="justify-between gap-10 bg-gray-800 text-white shadow-lg">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <VaultLogoComponent />
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  className="flex items-center gap-3 group py-3 px-4 rounded-lg transition-all duration-200 hover:bg-white"
                >
                  {React.cloneElement(link.icon, {
                    className: "h-5 w-5 shrink-0 text-white group-hover:text-[#0280CC]",
                  })}
                  <span className="text-white text-sm font-medium group-hover:text-[#0280CC]">
                    {link.label}
                  </span>
                </a>
              ))}
            </div>

            {/* Logout */}
            <div className="mt-auto p-4">
              <UserCardVault />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col z-10 overflow-y-auto">
        <div className="flex-1 flex flex-col gap-2 p-4 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* Logo del Vault */
export const VaultLogoComponent = () => {
  return (
    <a
      href="/vaulting"
      className="w-3/4 relative z-20 flex flex-col items-center justify-center py-3 px-4 rounded-lg"
    >
      <img
        src={VaultLogo}
        alt="Vault Logo"
        className="w-24 mb-2 drop-shadow-lg"
      />

    </a>
  );
};