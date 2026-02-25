import { useState } from "react";
import { ModalStepper } from "./ModalStepper";
import { Skeleton } from '@mantine/core';
import { FaTelegramPlane } from "react-icons/fa";

interface ButtonSendProps {
  isLoading?: boolean;
}

export const ButtonSend = ({ isLoading = false }: ButtonSendProps) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  if (isLoading) {
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
        className="
    bg-[#8E0B27]
    hover:bg-[#d8063b]
    text-white
    px-10 py-4
    rounded-2xl
    font-bold text-sm
    flex items-center
    transition-all duration-500 ease-out
    transform
    hover:-translate-y-1
    active:translate-y-0
    shadow-lg
    hover:shadow-xl
  "
      >
        <FaTelegramPlane className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
        <span className="relative z-10 font-semibold">Send USFCI</span>
      </button>

      <ModalStepper open={open} onClose={handleClose} />
    </>
  );
};
