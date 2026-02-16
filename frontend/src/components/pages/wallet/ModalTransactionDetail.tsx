import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { MdArrowUpward, MdArrowDownward } from "react-icons/md";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import logoFCI from "../../../assets/fci-logo.png";
import marcoDerecho from "../../../assets/marco.webp";
import { fromBaseUnits, formatUSFCI, truncateAddress } from "../../../lib/usfciUtils";

interface TransactionRecord {
    amount: string;
    metadata?: string;
    recipientAddress: string;
    recipientMspId: string;
    senderAddress: string;
    senderMspId: string;
    settlementType: string;
    timestamp: string;
    type?: 'sent' | 'received';
}

interface ModalTransactionDetailProps {
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
    badgeColor?: string;
    className?: string;
}

const DetailRow = ({
    label,
    value,
    isAddress = false,
    isMonospace = false,
    isBadge = false,
    badgeColor = "red",
    className = "",
}: DetailRowProps) => {
    const badgeColors = {
        red: "bg-red-100 text-red-600 border-red-300",
        green: "bg-green-100 text-green-600 border-green-300",
        blue: "bg-blue-100 text-blue-600 border-blue-300"
    };

    return (
        <div className={`py-2 ${className}`}>
            <p className="uppercase text-xs tracking-wider text-gray-500 font-semibold">
                {label}
            </p>
            {isBadge ? (
                <span className={`inline-block mt-1 text-sm px-3 py-1 rounded-md border shadow-sm ${badgeColors[badgeColor]}`}>
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
};

export const ModalTransactionDetail = ({
    opened,
    onClose,
    transaction,
}: ModalTransactionDetailProps) => {
    if (!transaction) return null;

    const isSent = transaction.type === 'sent';
    const formattedTimestamp = new Date(transaction.timestamp).toLocaleString();
    
    // ✅ Convertir amount de unidades base a USFCI legible
    const amountInUSFCI = fromBaseUnits(transaction.amount);
    const formattedAmount = formatUSFCI(amountInUSFCI, 2);

    const AddressCard = ({
        title,
        mspId,
        address,
        icon,
        isHighlight = false
    }: {
        title: string;
        mspId: string;
        address: string;
        icon: React.ReactNode;
        isHighlight?: boolean;
    }) => (
        <div className={`p-5 rounded-2xl shadow-md border-2 transition-all duration-300 ${isHighlight
                ? isSent
                    ? 'border-red-300 bg-red-50/50'
                    : 'border-green-300 bg-green-50/50'
                : 'border-gray-200 bg-white'
            } hover:shadow-xl`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-md ${isHighlight
                        ? isSent
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                    {icon}
                </div>
                <h3 className="font-bold text-gray-800">{title}</h3>
                {isHighlight && (
                    <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full bg-white border">
                        You
                    </span>
                )}
            </div>
            <div className="h-px bg-gray-200 mb-3"></div>
            <DetailRow label="MSP ID" value={mspId} className="pb-2" />
            <DetailRow
                label="Address"
                value={truncateAddress(address, 10, 8)}
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
                            <Dialog.Panel className={`relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white border-2 shadow-2xl transition-all ${isSent ? 'border-red-300' : 'border-green-300'
                                }`}>
                                {/* Fondo marco */}
                                <div
                                    className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none bg-no-repeat bg-right bg-contain"
                                    style={{ backgroundImage: `url(${marcoDerecho})` }}
                                />

                                {/* Header con logo */}
                                <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white relative z-10`}>
                                    <Dialog.Title className="text-xl font-extrabold text-gray-900 flex items-center gap-3">
                                        <img src={logoFCI} alt="Logo FCI" className="h-8 w-auto" />
                                        <span>Transaction Details</span>
                                        <span className={`ml-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${isSent
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                            }`}>
                                            {isSent ? (
                                                <>
                                                    <ArrowUpRight className="w-3 h-3" />
                                                    Sent
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowDownLeft className="w-3 h-3" />
                                                    Received
                                                </>
                                            )}
                                        </span>
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className={`text-gray-400 transition-colors cursor-pointer ${isSent ? 'hover:text-red-600' : 'hover:text-green-600'
                                            }`}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-6 relative z-10">
                                    {/* Amount */}
                                    <div className={`mb-6 p-6 rounded-xl shadow-md border-l-4 ${isSent ? 'border-red-600 bg-red-50/30' : 'border-green-600 bg-green-50/30'
                                        }`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="uppercase text-xs text-gray-500 font-semibold">
                                                    Amount {isSent ? 'Sent' : 'Received'}
                                                </p>
                                                <p className={`text-3xl font-extrabold mt-1 ${isSent ? 'text-red-700' : 'text-green-700'
                                                    }`}>
                                                    {isSent ? '-' : '+'}{formattedAmount}{" "}
                                                    <span className={`text-xl ${isSent ? 'text-red-600/80' : 'text-green-600/80'
                                                        }`}>USFCI</span>
                                                </p>
                                            </div>
                                            <DetailRow
                                                label="Type"
                                                value={transaction.settlementType}
                                                isBadge
                                                badgeColor={isSent ? "red" : "green"}
                                            />
                                        </div>

                                        <div className="h-px bg-gray-200 my-4"></div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailRow
                                                label="Settlement"
                                                value={transaction.settlementType}
                                                isBadge
                                                badgeColor="blue"
                                            />
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
                                            isHighlight={isSent}
                                        />
                                        <AddressCard
                                            title="Recipient"
                                            mspId={transaction.recipientMspId}
                                            address={transaction.recipientAddress}
                                            icon={<MdArrowDownward size={20} />}
                                            isHighlight={!isSent}
                                        />
                                    </div>

                                    {/* Metadata */}
                                    {transaction.metadata && (
                                        <div className={`p-5 rounded-xl shadow-sm border ${isSent
                                                ? 'border-red-200 bg-red-50/30'
                                                : 'border-green-200 bg-green-50/30'
                                            }`}>
                                            <p className={`uppercase text-xs font-bold tracking-wider mb-2 ${isSent ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                Description
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