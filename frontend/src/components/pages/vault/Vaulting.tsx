import "@progress/kendo-theme-default/dist/all.css";
import { useEffect, useState } from "react";
import PieChart from "../../chart/PieChart";
import DoughnutNumber from "../../chart/DoughnutNumber";
import { TableVault } from "./TableVault";

export interface LoanByState {
  stateUid: string;
  stateName: string;
  uPB: number;
  uPBDelinquency: number;
  totalLoans: number;
  totalDelinquency: number;
}

export const Vaulting = () => {
  const key = localStorage.getItem("vaultKey");
  const [dataState, setDataState] = useState<{ stateName: string; totalLoans: number; uPB: number }[]>([]);
  const [totalLoans, setTotalLoans] = useState(0);
  const [totalUPB, setTotalUPB] = useState("");
  const [dataStatus, setDataStatus] = useState<{ stateName: string; totalLoans: number }[]>([]);

  const fetchDataState = () => {
    const storedUser = localStorage.getItem("vaultUser");
    if (!key || !storedUser) {
      console.warn("Falta token o usuario en localStorage");
      return;
    }

    const user = JSON.parse(storedUser);

    const graphql = JSON.stringify({
      query: `
        {
          getLoanListByStateBC(useruid: "${user.uid}") {
            stateUid
            stateName
            uPB
            uPBDelinquency
            totalLoans
            totalDelinquency
          }
          getLoanListByStatusBC(useruid: "${user.uid}") {
            count
            statusEnum
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
      redirect: "follow",
    };

    fetch("https://fapi.myfci.com/graphql", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        const ListByState = result?.data?.getLoanListByStateBC;
        const ListByStatus = result?.data?.getLoanListByStatusBC;
        if ( result !== undefined &&  ListByState !== null &&   ListByStatus !== null ) {
          const data = ListByState.map(
            (item: { stateName: string; totalLoans: number }) => ({
              stateName: item.stateName,
              totalLoans: item.totalLoans,
            })
          );

          const totalLoansSum = ListByState.reduce((acc: number, item: { totalLoans: number }) => acc + item.totalLoans, 0);

          const formattedUPB = ListByState.reduce(
            (acc: number, item: { uPB: number }) => acc + item.uPB, 0
          ).toLocaleString("en-US", { style: "currency", currency: "USD" });

          const listStatus = ListByStatus.map(
            (item: { statusEnum: string; count: number }) => ({
              stateName: item.statusEnum,
              totalLoans: item.count,
            })
          );

          setDataState(data);
          setTotalUPB(formattedUPB);
          setTotalLoans(totalLoansSum);
          setDataStatus(listStatus);
        } else {
          throw new Error(result.errors);
        }
      })
      .catch((error) => {
        throw new Error(error);
      });
  };

  useEffect(() => {
    fetchDataState();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 overflow-y-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">Vault</h1>
        <p className="text-gray-600">
          Your loan information, from multiple servicers in one place.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="border border-gray-200 rounded-xl col-span-2">
            <div className="bg-gray-100 py-2 text-center font-semibold border-b border-gray-200">
              Loans By Status
            </div>
            <div className="p-6 text-gray-400 text-center">
              <PieChart data={dataState} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl col-span-2">
            <div className="bg-gray-100 py-2 text-center font-semibold border-b border-gray-200">
              Loans By State
            </div>
            <div className="p-6 text-gray-400 text-center">
              <PieChart data={dataStatus} />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-10">
            <div className="text-center">
              <div className="font-semibold mb-2">Total Loans</div>
              <div className="relative w-60 h-40">
                <DoughnutNumber listData={totalLoans} />
              </div>
            </div>

            <div className="text-center">
              <div className="font-semibold mb-2">UPB Loans</div>
              <div className="relative w-60 h-40">
                <DoughnutNumber listData={totalUPB} />

              </div>
            </div>
          </div>
        </div>
      </div>

      <TableVault />
    </div>
  );
};
