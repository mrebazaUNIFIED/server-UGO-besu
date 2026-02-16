import { HistoryTransaction } from "../components/pages/wallet/HistoryTransaction"
import { MyWallet } from "../components/pages/wallet/MyWallet"
import { WalletCard } from "../components/pages/wallet/WalletCard"
import { ButtonSend } from "../components/pages/wallet/ButtonSend"

const WalletPage = () => {
    return (
        <div className="w-full mx-auto my-12 space-y-7">
            {/* Fila de WalletCard y MyWallet con grid responsivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
                <WalletCard />
                <MyWallet />
            </div>

            {/* Botón de envío centrado */}
            <div className="flex items-center justify-center">
                <ButtonSend />
            </div>

            {/* Historial de transacciones */}
            <div>
                <HistoryTransaction />
            </div>
        </div>
    )
}

export default WalletPage
