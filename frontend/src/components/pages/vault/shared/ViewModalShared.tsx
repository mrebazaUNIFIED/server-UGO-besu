import React, { useState } from 'react';
import { Dialog, Transition, Disclosure } from '@headlessui/react';
import { Fragment } from 'react';
import { X, ChevronDown, User, Calendar, Key, FileText, CheckCircle, XCircle, Copy, Check, Loader2, DollarSign, Home, Mail, Phone, Users } from 'lucide-react';
import { useLoan } from '../../../../services/apiVault';

interface ViewModalSharedProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any | null;
}

export const ViewModalShared: React.FC<ViewModalSharedProps> = ({ isOpen, onClose, asset }) => {
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  // Helper function para manejar fechas que pueden venir como string o Date
  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    
    // Si ya es un string de fecha ISO, parsear a Date
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Verificar si es una fecha válida
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(asset.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#0280CC] to-blue-500 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg">
                        <FileText className="w-6 h-6 text-[#0280CC]" />
                      </div>
                      <div>
                        <Dialog.Title className="text-xl font-bold text-white">
                          {asset.name || 'Unnamed Share'}
                        </Dialog.Title>
                        <p className="text-blue-100 text-sm mt-1">
                          Shared Account Details
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
                  {/* Status Badge and Dates */}
                  <div className="mb-6 flex items-center gap-4 flex-wrap">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
                      asset.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {asset.isActive ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Created: {formatDate(asset.createdAt)}</span>
                    </div>
                    {asset.updatedAt && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Updated: {formatDate(asset.updatedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Owner Information */}
                  <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Owner Information</h3>
                        <div className="grid grid-cols-1 gap-3">
                          
                          <div>
                            <dt className="text-xs font-medium text-blue-700 uppercase mb-1">Owner Address</dt>
                            <dd className="text-sm font-mono text-blue-900 break-all">{asset.ownerAddress || 'N/A'}</dd>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Share Key */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Share Key</h3>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-gray-200 font-mono text-gray-800 break-all">
                            {asset.key}
                          </code>
                          <button
                            onClick={handleCopyKey}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                              copied
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                            title={copied ? 'Copied!' : 'Copy key'}
                          >
                            {copied ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span className="text-xs">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span className="text-xs">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shared With Section */}
                  {asset.sharedWith && asset.sharedWith.length > 0 && (
                    <div className="mb-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-purple-900 mb-3">
                            Shared With ({asset.sharedWith.length} {asset.sharedWith.length === 1 ? 'user' : 'users'})
                          </h3>
                          <div className="space-y-2">
                            {asset.sharedWith.map((address: string, idx: number) => (
                              <div key={idx} className="bg-white rounded-lg p-3 border border-purple-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div>
                                    <dt className="text-xs font-medium text-purple-700 uppercase mb-1">Wallet Address</dt>
                                    <dd className="text-xs font-mono text-purple-900 break-all">{address}</dd>
                                  </div>
                                 
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Accounts Accordion */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Accounts ({asset.accounts?.length || 0})
                    </h3>

                    {!asset.accounts || asset.accounts.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-600">No accounts associated with this share</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {asset.accounts.map((accountId: string, index: number) => (
                          <AccountAccordionItem 
                            key={accountId} 
                            accountId={accountId} 
                            index={index} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="cursor-pointer px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Componente separado para cada account con su propia query
interface AccountAccordionItemProps {
  accountId: string;
  index: number;
}

const AccountAccordionItem: React.FC<AccountAccordionItemProps> = ({ accountId, index }) => {
  const { data: loan, isLoading, isError } = useLoan(accountId);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Disclosure>
      {({ open }) => (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Disclosure.Button className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">
                  Account #{accountId}
                </p>
                {!open && loan && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {loan.BorrowerFullName || 'Unknown Borrower'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoading && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              )}
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </div>
          </Disclosure.Button>
          
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="px-4 py-4 bg-gray-50 border-t border-gray-200">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Loading account details...</span>
                </div>
              ) : isError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Failed to load account details</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Account ID: {accountId}</p>
                </div>
              ) : loan ? (
                <div className="space-y-4">
                  {/* Borrower Information */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Borrower Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Full Name</dt>
                        <dd className="text-sm font-semibold text-gray-900">{loan.BorrowerFullName || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Phone
                        </dt>
                        <dd className="text-sm font-semibold text-gray-900">{loan.BorrowerHomePhone || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Email
                        </dt>
                        <dd className="text-sm font-semibold text-gray-900">{loan.BorrowerEmail || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Occupancy Status</dt>
                        <dd className="text-sm font-semibold text-gray-900">{loan.BorrowerOccupancyStatus || 'N/A'}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          Property Address
                        </dt>
                        <dd className="text-sm font-semibold text-gray-900">
                          {loan.BorrowerPropertyAddress || 'N/A'}
                          {(loan.BorrowerCity || loan.BorrowerState || loan.BorrowerZip) && (
                            <span className="text-gray-600">
                              {', '}{loan.BorrowerCity}{loan.BorrowerState ? `, ${loan.BorrowerState}` : ''}{loan.BorrowerZip ? ` ${loan.BorrowerZip}` : ''}
                            </span>
                          )}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-gray-900">Financial Details</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <dt className="text-xs font-medium text-blue-700 uppercase mb-1">Current Principal</dt>
                        <dd className="text-lg font-bold text-blue-900">{formatCurrency(loan.CurrentPrincipalBal)}</dd>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <dt className="text-xs font-medium text-green-700 uppercase mb-1">Original Loan</dt>
                        <dd className="text-lg font-bold text-green-900">{formatCurrency(loan.OriginalLoanAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Note Rate</dt>
                        <dd className="text-sm font-semibold text-gray-900">{loan.NoteRate}%</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Scheduled Payment</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatCurrency(loan.ScheduledPayment)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Unpaid Interest</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatCurrency(loan.UnpaidInterest)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Late Fees</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatCurrency(loan.LateFeesAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Escrow Balance</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatCurrency(loan.EscrowBalance)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Total In Trust</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatCurrency(loan.TotalInTrust)}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Loan Dates */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-gray-900">Important Dates</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Origination Date</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.OriginationDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Maturity Date</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.LoanMaturityDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Next Payment Due</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.NextPaymentDue)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Last Payment</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.LastPaymentRec)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Interest Paid To</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.InterestPaidTo)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Days Since Last Payment</dt>
                        <dd className="text-sm font-semibold text-gray-900">{loan.DaysSinceLastPymt || '0'} days</dd>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Account Status</dt>
                        <dd className="text-lg font-bold text-gray-900">{loan.Status || 'N/A'}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          loan.Status === 'PERFORMING' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {loan.Status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No account data available
                </div>
              )}
            </Disclosure.Panel>
          </Transition>
        </div>
      )}
    </Disclosure>
  );
};