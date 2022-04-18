require("dotenv").config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy');

module.exports = {
  solidity: {
    version: "0.8.2" ,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  mocha: {
    timeout: 600000
  },
  namedAccounts: {
    comptroller: {
      mainnet: '0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB',
      avalanche: '0x2eE80614Ccbc5e28654324a66A396458Fa5cD7Cc',
      fantom: '0x4250A6D3BD57455d7C6821eECb6206F507576cD2',
    },
    deployer: 0,
    multisig: {
      mainnet: '0xA5fC0BbfcD05827ed582869b7254b6f141BA84Eb',
      avalanche: '0xf3472A93B94A17dC20F9Dc9D0D48De42FfbD14f4',
      fantom: '0xA5fC0BbfcD05827ed582869b7254b6f141BA84Eb'
    },
    wrappedNative: {
      mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      avalanche: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      fantom: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'
    },
    usdcBurner: {
      mainnet: '',
      avalanche: '',
      fantom: ''
    },
    usdc: {
      mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      avalanche: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
      fantom: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75'
    }
  },
  networks: {
    hardhat: {
        forking: {
          enabled: false,
          url: `https://mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`,
        }
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`,
      accounts: process.env.DEPLOY_PRIVATE_KEY == undefined ? [] : [`0x${process.env.DEPLOY_PRIVATE_KEY}`]
    },
    fantom: {
        url: 'https://rpc.ftm.tools/',
        accounts:
          process.env.DEPLOY_PRIVATE_KEY == undefined ? [] : [`0x${process.env.DEPLOY_PRIVATE_KEY}`]
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      accounts: process.env.DEPLOY_PRIVATE_KEY == undefined ? [] : [`0x${process.env.DEPLOY_PRIVATE_KEY}`]
    },
  }
};
