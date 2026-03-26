import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const USFCI_ADDRESS = "0xF15005Fdd6ECDf4478DdBb1D9C47b6203f16b39b";
const RELAYER_ADDRESS = "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73";

async function check() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const abi = [
        "function hasRole(bytes32 role, address account) view returns (bool)",
        "function MINTER_ROLE() view returns (bytes32)",
        "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
        "function paused() view returns (bool)"
    ];
    const contract = new ethers.Contract(USFCI_ADDRESS, abi, provider);

    try {
        const minterRole = await contract.MINTER_ROLE();
        const isAdmin = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), RELAYER_ADDRESS);
        const isMinter = await contract.hasRole(minterRole, RELAYER_ADDRESS);
        const isPaused = await contract.paused();

        console.log(`Relayer: ${RELAYER_ADDRESS}`);
        console.log(`Is Admin: ${isAdmin}`);
        console.log(`Is Minter: ${isMinter}`);
        console.log(`Is Paused: ${isPaused}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
