import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { MdArrowUpward, MdArrowDownward } from "react-icons/md";
import logoFCI from "../../../assets/fci-logo.png";
import marcoDerecho from "../../../assets/marco.webp";
import { formatFromBaseUnits } from "../../../lib/usfciUtils";
import type { TransactionRecord } from "../../../types";

interface ModalTransferProps {
    opened: boolean;
    onClose: () => void;
    transaction: TransactionRecord | null;
}

interface DetailRowProps {
    label: string;
    value: React.ReactNode;
    isAddress?: boolean;
    isMonospace?: boolean;
    isBadge?: boolean;
    className?: string;
}

const DetailRow = ({
    label,
    value,
    isAddress = false,
    isMonospace = false,
    isBadge = false,
    className = "",
}: DetailRowProps) => (
    <div className={`py-2 ${className}`}>
        <p className="uppercase text-xs tracking-wider text-gray-500 font-semibold">
            {label}
        </p>
        {isBadge ? (
            <span className="inline-block mt-1 text-sm px-3 py-1 rounded-md bg-red-100 text-red-600 border border-red-300 shadow-sm">
                {value}
            </span>
        ) : (
            <p
                className={`mt-1 text-sm text-gray-800 ${isMonospace ? "font-mono" : "font-medium"
                    } ${isAddress ? "break-all text-gray-700" : ""}`}
            >
                {value}
            </p>
        )}
    </div>
);

export const ModalTransfer = ({
    opened,
    onClose,
    transaction,
}: ModalTransferProps) => {
    if (!transaction) return null;

    const formattedTimestamp = new Date(transaction.timestamp).toLocaleString();
    // ✅ Usar formatFromBaseUnits que maneja la conversión y formato correctamente
    const formattedAmount = formatFromBaseUnits(transaction.amount, 2);

    const AddressCard = ({
        title,
        mspId,
        address,
        icon,
    }: {
        title: string;
        mspId: string;
        address: string;
        icon: React.ReactNode;
    }) => (
        <div className="p-5 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl transition-all duration-300 bg-white">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-md bg-red-100 text-red-600">{icon}</div>
                <h3 className="font-bold text-gray-800">{title}</h3>
            </div>
            <div className="h-px bg-gray-200 mb-3"></div>
            <DetailRow label="MSP ID" value={mspId} className="pb-2" />
            <DetailRow
                label="Address"
                value={address}
                isAddress
                isMonospace
                className="pt-1"
            />
        </div>
    );

    return (
        <Transition appear show={opened} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                {/* Fondo oscuro */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                </Transition.Child>

                {/* Contenido */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white border-2 border-red-300 shadow-2xl transition-all">
                                {/* Fondo marco */}
                                <div
                                    className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none bg-no-repeat bg-right bg-contain"
                                    style={{ backgroundImage: `url(${marcoDerecho})` }}
                                />

                                {/* Header con logo */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white relative z-10">
                                    <Dialog.Title className="text-xl font-extrabold text-gray-900 flex items-center gap-3">
                                        <img src={logoFCI} alt="Logo FCI" className="h-8 w-auto" />
                                        Transfer Details 
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-6 relative z-10">
                                    {/* Amount */}
                                    <div className="mb-6 p-6 rounded-xl shadow-md border-l-4 border-red-600">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="uppercase text-xs text-gray-500 font-semibold">
                                                    Amount
                                                </p>
                                                <p className="text-3xl font-extrabold text-red-700 mt-1">
                                                    {formattedAmount}{" "}
                                                    <span className="text-xl text-red-600/80">USFCI</span>
                                                </p>
                                            </div>
                                            <DetailRow
                                                label="Type"
                                                value={transaction.settlementType}
                                                isBadge
                                            />
                                        </div>

                                        <div className="h-px bg-gray-200 my-4"></div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailRow label="Date & Time" value={formattedTimestamp} />
                                        </div>
                                    </div>

                                    {/* Parties */}
                                    <div className="text-center my-4">
                                        <span className="text-xs uppercase tracking-widest font-semibold text-gray-700 bg-gray-200 px-3 py-1 rounded-full">
                                            Involved Parties
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                                        <AddressCard
                                            title="Sender"
                                            mspId={transaction.senderMspId}
                                            address={transaction.senderAddress}
                                            icon={<MdArrowUpward size={20} />}
                                        />
                                        <AddressCard
                                            title="Recipient"
                                            mspId={transaction.recipientMspId}
                                            address={transaction.recipientAddress}
                                            icon={<MdArrowDownward size={20} />}
                                        />
                                    </div>

                                    {/* Metadata */}
                                    {transaction.metadata && (
                                        <div className="p-5 rounded-xl shadow-sm border border-gray-200">
                                            <p className="uppercase text-xs font-bold tracking-wider text-red-600 mb-2">
                                                Additional Information 
                                            </p>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                {transaction.metadata}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};