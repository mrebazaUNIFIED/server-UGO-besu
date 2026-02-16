import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Transition,
} from "@headlessui/react";
import { Fragment} from "react";
import { Tabs } from "../Tabs/Tabs";
import { IoClose } from "react-icons/io5";
import { TabDashboard } from "../pages/vault/TabLoanDetail/TabDashboard";
import type { Loan } from "../../types/vaultTypes";
import { TabTransaction } from "../pages/vault/TabLoanDetail/TabTransaction";
import { TabTraceability } from "../pages/vault/TabLoanDetail/TabTraceability";
import { TabDocuments } from "../pages/vault/TabLoanDetail/TabDocuments";
import { TabCertificate } from "../pages/vault/TabLoanDetail/TabCertificate";


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan ;
}

export const LoanDetailModal: React.FC<ModalProps> = ({ isOpen,  onClose,  loan}) => {

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/70  transition-opacity  data-enter:duration-300 data-enter:ease-out
           data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center  text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className=" bg-white border shadow-2xl  rounded-2xl md:w-[1000px]  h-[700px] flex sm:w-[700px]  flex-col "
            >
              <div className="flex items-center justify-between  border-b border-gray-200 px-6 h-[60px]">
                <Dialog.Title className="text-xl text-gray-900">
                  Loan Details
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <IoClose size={28} />
                </button>
              </div>
              <div className="px-6 bg-white    w-[990px]  h-[600px] flex  flex-col">
                <div className="flex flex-row mb-4 mt-3">
                  <div className="basis-1/3 text-start">
                    Account: {loan?.Account}
                  </div>
                  <div className="basis-2/3 text-start">
                    Borrower: {loan?.LenderName}
                  </div>
                </div>
                <Tabs
                  tabs={[
                    {
                      label: "Dashboard",
                      content: <TabDashboard loanUid={loan.LoanUid} hash={loan.TxId}  />,
                    },
                    {
                      label: "Transaction History",
                      content: <TabTransaction loanUid={loan.LoanUid}/>,
                    },
                    {
                      label: "Traceability of Assets",
                      content: <TabTraceability loanUid={loan.Account}/>,
                    },
                    { label: "Documents", content: <TabDocuments account={loan.Account} /> },
                    {
                      label: "Certificate of Authenticity",
                      content: <TabCertificate loan={loan}/>
                    },
                  ]}
                  className="flex-1 flex flex-col overflow-hidden"
                />
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
