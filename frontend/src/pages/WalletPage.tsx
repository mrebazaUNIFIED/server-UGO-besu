import { HistoryTransaction } from "../components/pages/wallet/HistoryTransaction"
import { MyWallet } from "../components/pages/wallet/MyWallet"
import { WalletCard } from "../components/pages/wallet/WalletCard"
import { ButtonSend } from "../components/pages/wallet/ButtonSend"
import { PageMeta } from "../components/ui/PageMeta"

const WalletPage = () => {
  return (
    <div className="w-full mx-auto my-12 space-y-7 ">
      <PageMeta title="USFCI - Wallet" />
      <h2 className="text-3xl font-bold mb-8 text-(--rojo)">My Personal Wallet</h2>
      {/* Fila de WalletCard y MyWallet con grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          <WalletCard />
          <HistoryTransaction />
        </div>
        <MyWallet />
      </div>



    </div>
  )
}

export default WalletPage
