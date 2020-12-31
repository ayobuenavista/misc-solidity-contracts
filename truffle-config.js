require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const mnemonic = process.env.MNEMONIC;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      provider: () => new HDWalletProvider(mnemonic, 'http://localhost:8545', 0, 10),
      host: '127.0.0.1',
      port: 8545,
      network_id: 5777,
      gas: 6721975,
      gasPrice: 20000000000,
      confirmations: 0,
      timeoutBlocks: 50,
      skipDryRun: true,
    },
    kovan: {
      provider: () => new HDWalletProvider(
        mnemonic,
        `https://kovan.infura.io/v3/${process.env.INFURA}`,
        0,
        10
      ),
      host: `kovan.infura.io/v3/${process.env.INFURA}`,
      network_id: 42,
      gas: 7000000,
      gasPrice: 20000000000,
      confirmations: 0,
      timeoutBlocks: 500,
      skipDryRun: false,
    },
    rinkeby: {
      provider: () => new HDWalletProvider(
        mnemonic,
        `https://rinkeby.infura.io/v3/${process.env.INFURA}`,
        0,
        10
      ),
      host: `rinkeby.infura.io/v3/${process.env.INFURA}`,
      network_id: 4,
      gas: 6900000,
      gasPrice: 25000000000,
      confirmations: 1,
      timeoutBlocks: 500,
      skipDryRun: false,
    },
    ropsten: {
      provider: () => new HDWalletProvider(
        mnemonic,
        `https://ropsten.infura.io/v3/${process.env.INFURA}`,
        0,
        10
      ),
      host: `ropsten.infura.io/v3/${process.env.INFURA}`,
      network_id: 3,
      gas: 7000000,
      gasPrice: 20000000000,
      confirmations: 0,
      timeoutBlocks: 500,
      skipDryRun: false,
    },
    mainnet: {
      provider: () => new HDWalletProvider(mnemonic, 'http://localhost:8545', 0, 10),
      host: '127.0.0.1',
      port: 8545,
      network_id: 1,
      gas: 1500000,
      gasPrice: 44000000000,
      confirmations: 0,
      timeoutBlocks: 500,
      skipDryRun: false,
    },
  },
  compilers: {
    solc: {
      version: '0.6.6',
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
