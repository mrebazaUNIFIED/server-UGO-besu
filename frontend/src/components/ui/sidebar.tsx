"use client";
import { cn } from "../../lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
    undefined
);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(false);

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
            {children}
        </SidebarProvider>
    );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
    return (
        <>
            <DesktopSidebar {...props} />
            <MobileSidebar {...(props as React.ComponentProps<"div">)} />
        </>
    );
};

export const DesktopSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof motion.div>) => {
    const { open, setOpen, animate } = useSidebar();
    return (
        <>
            <motion.div
                className={cn(
                    "px-6 py-6 hidden md:flex md:flex-col bg-[var(--negro-light)] w-[350px] shrink-0 border-r-2 border-gray-200 m-10 rounded-lg",
                    className
                )}
                animate={{
                    width: animate ? (open ? "350px" : "72px") : "350px",
                }}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                {...props}
            >
                {children}
            </motion.div>
        </>
    );
};

export const MobileSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) => {
    const { open, setOpen } = useSidebar();
    return (
        <>
            <div
                className={cn(
                    "h-12 px-6 py-4 flex flex-row md:hidden items-center justify-between bg-white border-b-2 border-gray-200 w-full"
                )}
                {...props}
            >
                <div className="flex justify-end z-20 w-full">
                    <IconMenu2
                        className="text-neutral-800"
                        onClick={() => setOpen(!open)}
                    />
                </div>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        >
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className={cn(
                                    "fixed top-0 left-0 h-full w-10/12 bg-gray-100 p-10 flex flex-col justify-between shadow-lg",
                                    className
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div
                                    className="absolute right-6 top-6 text-neutral-800"
                                    onClick={() => setOpen(false)}
                                >
                                    <IconX />
                                </div>
                                {children}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export const SidebarLink = ({
    link,
    className,
    ...props
}: {
    link: Links;
    className?: string;
}) => {
    const { open, animate } = useSidebar();

    return (
        <a
            href={link.href}
            className={cn(
                "flex items-center gap-3 group py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors duration-200",
                className
            )}
            {...props}
        >
            {/* Icono */}
            <span className="text-2xl text-neutral-700 transition-colors duration-150 group-hover:text-neutral-800">
                {link.icon}
            </span>

            {/* Label */}
            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="text-neutral-400 font-medium text-base transition duration-150 whitespace-pre inline-block !p-0 !m-0 
                   group-hover:translate-x-1 group-hover:text-neutral-800"
            >
                {link.label}
            </motion.span>
        </a>
    );
};
