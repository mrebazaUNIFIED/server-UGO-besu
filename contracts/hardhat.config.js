require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
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
    hardhat: { chainId: 12345 },
    besu: {
      url: "http://localhost:8050",
      accounts: [process.env.RELAYER_PRIVATE_KEY],
      chainId: 12345,
      gas: 80000000,
      gasPrice: 0,
      timeout: 60000
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.RELAYER_PRIVATE_KEY],
      chainId: 43113,
      gas: 8000000,
      gasPrice: 25000000000,
      timeout: 60000
    }
  },


};