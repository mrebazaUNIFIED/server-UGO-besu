import { ethers } from 'ethers';

const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const TX_HASH = "0x7dfbd3632c1503d9d5f3824782c37f15ca86edbf9f12e6bd9293a679442efdef";

async function debug() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const tx = await provider.getTransaction(TX_HASH);
    
    if (!tx) {
        console.error("Transaction not found");
        return;
    }

    try {
        const code = await provider.call({
            to: tx.to,
            from: tx.from,
            data: tx.data,
            value: tx.value,
            blockTag: tx.blockNumber - 1
        });
        console.log("Call result:", code);
    } catch (error) {
        console.log("Revert reason:", error.message);
        if (error.data) {
            console.log("Error data:", error.data);
            try {
                // Remove 0x and the 4-byte selector (8 chars)
                const data = error.data.substring(10);
                const reason = ethers.toUtf8String('0x' + data.substring(64));
                console.log("Decoded reason snippet:", reason);
            } catch (e) {}
        }
    }
}

debug();
