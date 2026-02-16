import { useState } from "react";
import { IoIosSend } from "react-icons/io";
import { ModalStepper } from "./ModalStepper";
import { Skeleton } from '@mantine/core';

interface ButtonSendProps {
    isLoading?: boolean;
}

export const ButtonSend = ({ isLoading = false }: ButtonSendProps) => {
    const [open, setOpen] = useState<boolean>(false);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    if (isLoading) {
        // Skeleton completo del botón
        return (
            <Skeleton
                height={48}
                width={200}
                radius="xl"
                animate
                className="max-w-full"
            />
        );
    }

    return (
        <>
            <button
                onClick={handleOpen}
                className="cursor-pointer group relative inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-[var(--negro)] to-[var(--rojo)] rounded-full shadow-lg hover:shadow-xl hover:from-[var(--negro-light)] hover:to-[var(--rojo-claro)] focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
                <span className="absolute inset-0 bg-gradient-to-r from-[var(--negro-light)] to-[var(--rojo-claro)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></span>
                <IoIosSend className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">Send USFCI</span>
            </button>

            <ModalStepper open={open} onClose={handleClose} />
        </>
    );
};
