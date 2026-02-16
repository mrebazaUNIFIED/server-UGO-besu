import { useQuery } from '@tanstack/react-query';
import React from 'react'
import type { IPFS } from '../../../../types/vaultTypes';
import { Oval } from 'react-loader-spinner';
import { dateFormat2 } from '../../../../lib/utils';
interface ModalProps {
  account: string;
}

export const TabDocuments: React.FC<ModalProps> = ({ account }) => {

  const fetchLoanHistory = async (): Promise<IPFS[]> => {
    const key = localStorage.getItem("vaultKey");
    if (!key) throw new Error("Missing vaultKey in localStorage");

    const graphql = JSON.stringify({
        query: `
        {
          getLoanAttachmentsBC(account: "${account}") {
            loanUid,
            account
            type,
            name,
            date,
            ipfshash,
            code
          }
        }
      `,
      });

    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: graphql,
    };

    const response = await fetch("https://fapi.myfci.com/graphql", requestOptions);
    const result = await response.json();

    const data = result?.data?.getLoanAttachmentsBC;
    if (!data) throw new Error("Failed to fetch loan history");
    const  dataLoanAttachments = data.filter((x: IPFS) => x.ipfshash !== "" && x.ipfshash !== null) as IPFS[];

    return dataLoanAttachments;
  };

  const {
    data: LoanAttachments = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["IPFS", account],
    queryFn: fetchLoanHistory,
    enabled: !!account, 
    refetchOnWindowFocus: false
  });


  return (
    <div className="mt-4">
      <div className="overflow-auto max-h-[480px]">

        {isLoading && (
          <div className="flex justify-center grid content-center h-100">
            <Oval
              visible={true}
              height="100"
              width="100"
              color="#3F83F8"
              ariaLabel="oval-loading"
              secondaryColor="#80aefd"
            />
          </div>
        )}

        {isError && (
          <div className="text-center p-4 text-red-600">
            Error loading transactions.
          </div>
        )}

        {!isLoading && !isError && (
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden table-fixed">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Description</th>
                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-32">Type</th>
                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-40">Date</th>   
                <th className="p-2 sticky top-0 bg-blue-500 z-10 min-w-40">Code</th>             
              </tr>
            </thead>

            <tbody>
              {LoanAttachments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-4 text-gray-600">
                    No records available
                  </td>
                </tr>
              ) : (
                LoanAttachments.map((item, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50 transition-colors ">             
                    <td className="p-2 min-w-40">{item.name}</td>
                    <td className="p-2 min-w-32 text-center">{item.type}</td>
                    <td className="p-2 min-w-32 text-center">{dateFormat2(item.date) }</td>
                    <td className="p-2 min-w-32 text-center">{item.code}</td>    
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
