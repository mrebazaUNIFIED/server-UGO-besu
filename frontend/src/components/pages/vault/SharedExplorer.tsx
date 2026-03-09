import React, { useState } from 'react';
import { Disclosure, Transition } from '@headlessui/react';
import {
  Search,
  ChevronDown,
  User,
  Calendar,
  Key,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Home,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';

import { useShareAssetByKey } from "../../../services/apiShared"
import { useLoan } from '../../../services/apiVault';
import explorerImage from "../../../assets/explorer.png";
import { PageMeta } from '../../ui/PageMeta';
import { Nav } from '../landing/Nav';

export const SharedExplorer = () => {
  const [searchKey, setSearchKey] = useState("");
  const [shouldSearch, setShouldSearch] = useState(false);
  const [submittedKey, setSubmittedKey] = useState("");

  const { data: asset, isLoading, error } = useShareAssetByKey(submittedKey, shouldSearch);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchKey.trim()) {
      setSubmittedKey(searchKey.trim());
      setShouldSearch(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleReset = () => {
    setSearchKey("");
    setSubmittedKey("");
    setShouldSearch(false);
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <PageMeta title="Shared Explorer" />
        <div className="max-w-6xl w-full flex flex-col items-center px-6 py-10">
          <h1 className="text-3xl font-bold text-[#0280CC] mb-2 text-center">
            FCI Shared Loanss
          </h1>
          <p className="text-gray-600 text-sm mb-6 text-center">
            Search shared loans on the blockchain using a secure access key.
          </p>

          <div className="flex flex-col w-full space-y-2 mb-8">
            <div className="flex w-full">
              <input
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Please enter your shared key to search"
                className="flex-grow px-4 py-2 border border-blue-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              />
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={!searchKey.trim() || isLoading}
                className="cursor-pointer px-5 py-2 bg-[#0280CC] text-white font-semibold rounded-r-md hover:bg-[#026cae] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Search size={18} />
                )}
              </button>
            </div>

            {shouldSearch && (
              <button
                type="button"
                onClick={handleReset}
                className="cursor-pointer self-start text-sm text-[#026cae] hover:text-[#003e64] underline"
              >
                ← back
              </button>
            )}
          </div>

          {isLoading && (
            <div className="mt-10 text-center">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Searching blockchain...</p>
            </div>
          )}

          {error && shouldSearch && !isLoading && (
            <div className="mt-10 w-full max-w-4xl bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <XCircle className="text-red-500 text-3xl mr-3" />
                <div>
                  <h3 className="text-xl font-semibold text-red-700">Share Asset Not Found</h3>
                  <p className="text-red-600 text-sm mt-1">
                    No shared asset found for key: <code className="bg-red-100 px-2 py-1 rounded">{submittedKey}</code>
                  </p>
                </div>
              </div>
              <p className="text-gray-700 text-sm">
                Please verify the share key and try again. Make sure you're using a valid key from a shared asset.
              </p>
            </div>
          )}

          {asset && !isLoading && (
            <div className="w-full max-w-5xl">
              <div className={`rounded-t-lg p-6 ${asset.isActive ? 'bg-gradient-to-r from-[#0280CC] to-blue-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white p-2 rounded-lg">
                    <FileText className={`w-6 h-6 ${asset.isActive ? 'text-[#0280CC]' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{asset.name}</h2>
                    <p className={`text-sm ${asset.isActive ? 'text-blue-100' : 'text-gray-200'}`}>Shared Loan Portfolio</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-x border-gray-200 p-6">
                <div className="mb-6 flex items-center gap-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${asset.isActive
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
                </div>

                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Share Key</h3>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-gray-200 font-mono text-gray-800 break-all">
                          {asset.key}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                {!asset.isActive ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                          Share Asset Not Available
                        </h3>
                        <p className="text-yellow-800 text-sm mb-3">
                          This shared asset is currently inactive and its loan details are not available for viewing at this time.
                        </p>
                        <p className="text-yellow-700 text-xs">
                          Please contact the asset administrator if you believe this is an error or if you need access to this information.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Loans ({asset.accounts?.length || 0})
                    </h3>

                    {!asset.accounts || asset.accounts.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-600">No loans associated with this share</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {asset.accounts.map((loanId: string, index: number) => (
                          <LoanAccordionItem
                            key={loanId}
                            loanId={loanId}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-b-lg p-4 text-center">
                <p className="text-xs text-gray-500">
                  This record is immutably stored on the FCI Blockchain and cannot be altered or deleted
                </p>
              </div>
            </div>
          )}

          {!shouldSearch && (
            <div className="mt-10 w-full flex justify-center">
              <img
                src={explorerImage}
                alt="Blockchain Diagram"
                className="max-w-5xl w-full"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

interface LoanAccordionItemProps {
  loanId: string;
  index: number;
}

const LoanAccordionItem: React.FC<LoanAccordionItemProps> = ({ loanId, index }) => {
  const { data: loan, isLoading, isError } = useLoan(loanId);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
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
                  Loan #{index + 1}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoading && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              )}
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
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
                  <span className="ml-3 text-gray-600">Loading loan details...</span>
                </div>
              ) : isError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Failed to load loan details</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Loan ID: {loanId}</p>
                </div>
              ) : loan ? (
                <div className="space-y-4">
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

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-gray-900">Financial Details</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <dt className="text-xs font-medium text-blue-700 uppercase mb-1">Current Principal</dt>
                        <dd className="text-lg font-bold text-blue-900">{formatCurrency(loan.CurrentBalance)}</dd>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <dt className="text-xs font-medium text-green-700 uppercase mb-1">Original Loan</dt>
                        <dd className="text-lg font-bold text-green-900">{formatCurrency(loan.OriginalBalance)}</dd>
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
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.MaturityDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Next Payment Due</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.NextDueDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Last Payment</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.LastPaymentRec)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Interest Paid To</dt>
                        <dd className="text-sm font-semibold text-gray-900">{formatDate(loan.PaidToDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Days Since Last Payment</dt>
                        <dd className="text-sm font-semibold text-gray-900">{loan.DaysSinceLastPymt || '0'} days</dd>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase mb-1">Loan Status</dt>
                        <dd className="text-lg font-bold text-gray-900">{loan.Status || 'N/A'}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${loan.Status === 'PERFORMING'
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
                  No loan data available
                </div>
              )}
            </Disclosure.Panel>
          </Transition>
        </div>
      )}
    </Disclosure>
  );
};