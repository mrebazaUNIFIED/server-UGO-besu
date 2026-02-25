import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import {
  IconWallet,

  IconCoins,
  IconReport,
  IconFileText,
} from "@tabler/icons-react";
import { MdDashboard } from "react-icons/md";
import { FaBalanceScale } from "react-icons/fa";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { UserCard } from "../components/ui/LogoutOption";
import USFCIIcon from "../assets/fci-logo.png"
import { PageMeta } from "../components/ui/PageMeta";


export function DashboardPage() {
  const { user } = useAuth();

  const SUNWESTLink = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <MdDashboard className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: "Wallet",
      href: "/dashboard/wallet",
      icon: <IconWallet className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: "Token Management",
      href: "/dashboard/token-management",
      icon: <IconCoins className="h-5 w-5 shrink-0 text-neutral-700" />,

    }
  ];

  const FCILink = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <MdDashboard className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: "Wallet",
      href: "/dashboard/wallet",
      icon: <FaBalanceScale className="h-5 w-5 shrink-0 text-neutral-700" />,
    },

  ];

  const links = user?.role === "admin" ? SUNWESTLink : FCILink;

  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "w-screen h-screen flex-1 overflow-hidden bg-[--gris]",
        "md:flex md:flex-row" // 👈 solo flex-row en desktop
      )}
    >
      <Sidebar open={open} setOpen={setOpen} animate={false}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <Logo />
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
            {/* Logout Button with Tooltip */}
            <div className="mt-auto p-4">
              <UserCard />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content area */}
      <main className="flex flex-1 flex-col  z-10 bg-[#F8F9FA]">
        <div className="flex-1 flex-col gap-2 p-4 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export const Logo = () => {
  return (
    <>
      <PageMeta title="USFCI - Dashboard" description="" />
      <div className="">
        <div className="flex items-center space-x-3">
          <a
            href="/dashboard"
            className="flex items-center justify-center  rounded-lg w-20 h-20 shrink-0 transition-colors duration-200">
            <img src={USFCIIcon} alt="icon USFCI" className="w-23 h-23 object-contain" />
          </a>
          <div className="flex flex-col">
            <h1 className="text-white font-bold text-2xl leading-tight tracking-tight">STABLE COIN</h1>
            <span className="text-lg text-red-500 font-bold tracking-widest uppercase">Network </span>
          </div>
        </div>
      </div >
    </>
  );
};
