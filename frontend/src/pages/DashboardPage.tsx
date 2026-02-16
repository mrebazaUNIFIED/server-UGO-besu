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
        "w-screen h-screen flex-1 overflow-hidden bg-[var(--gris)]",
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
      <main className="flex flex-1 flex-col  z-10">
        <div className="flex-1 flex-col gap-2 p-4 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export const Logo = () => {
  return (
    <a
      href="/dashboard"
      className=" w-3/4 relative z-20 flex flex-col items-center justify-center space-x-3 py-2 px-4  text-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
    >
      <img src={USFCIIcon} alt="icon USFCI" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-bold whitespace-pre text-white"
      >
        Stable Coin
      </motion.span>
    </a>
  );
};
