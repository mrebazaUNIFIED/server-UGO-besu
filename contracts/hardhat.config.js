require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
      viaIR: true,
      evmVersion: "paris",
      metadata: {
        bytecodeHash: "none"
      }
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      chainId: 12345
    },
    besu: {
      url: "http://localhost:8050",
      accounts: [
        "0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",
      ],
      chainId: 12345,
      gas: 80000000,
      gasPrice: 0,
      timeout: 60000
    },
    // NUEVA RED: Avalanche Fuji Testnet
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [
        "0x9a3f2c81775e54982629ba4ac234b8982ce8d81e4533e5f58e4b481b0bda510c", // Puedes usar la misma o crear nueva
      ],
      chainId: 43113,
      gas: 8000000,
      gasPrice: 25000000000, // 25 gwei
      timeout: 60000
    }
  }
};