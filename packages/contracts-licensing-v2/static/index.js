const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const LicenseContract = require('../build/contracts/LicenseCore.json');

let web3;
let accounts;
let currentNetwork;

let contractAddress;

/**
 * Adds a 5% boost to the gas for web3 calls as to ensure tx's go through
 *
 * @param {string} estimatedGas amount of gas required from `estimateGas`
 */
const boostGas = estimatedGas => {
  const gasBoost = new BigNumber(estimatedGas, 10).div(new BigNumber('20')).floor();
  return new BigNumber(estimatedGas, 10).add(gasBoost).floor();
};

/**
 * Converts dollars to wei based on exchange rate
 *
 * @param {string} dollarToWei amoutn of dollars to be converted to wei
 */
const dollarToWei = (dollarAmount, exchangeRate) =>
  new BigNumber('1000000000000000000', 10)
    .divRound(new BigNumber(exchangeRate, 10))
    .mul(new BigNumber(dollarAmount, 10));

async function initWeb3() {
  // use Metamask, et al. if available
  // If no injected web3 instance is detected, fallback to Ganache CLI.
  const provider = web3 !== undefined ? web3.currentProvider : new Web3.providers.HttpProvider('http://127.0.0.1:8545');
  web3 = new Web3(provider);
  accounts = await web3.eth.getAccounts();
  currentNetwork = await web3.eth.net.getId();
}

const deploy = async () => {
  accounts = await web3.eth.getAccounts();
  const abi = new web3.eth.Contract(LicenseContract.abi);
  const estimatedGas = await abi
    .deploy({
      data: LicenseContract.bytecode,
    })
    .estimateGas();

  console.log('Attempting to deploy from account', accounts[0]);
  console.log('Gas', estimatedGas);

  const result = await new web3.eth.Contract(LicenseContract.abi)
    .deploy({ data: LicenseContract.bytecode })
    .send({ gas: boostGas(estimatedGas), from: accounts[0] });
  console.log('Contract deployed to', result.options.address);

  contractAddress = result.options.address;
};

// TODO
async function createProduct() {
  if (!LicenseContract.networks[currentNetwork] || !LicenseContract.networks[currentNetwork].address) {
    throw new Error(`LicenseCore.json doesn't contain an entry for the current network ID (${currentNetwork})`);
  }

  console.log(currentNetwork);
  console.log(LicenseContract.networks[currentNetwork].address);
  const ContractInstance = new web3.eth.Contract(LicenseContract.abi, LicenseContract.networks[currentNetwork].address);
  const firstProduct = {
    id: 1,
    price: 1000,
    initialInventory: 2,
    supply: 2,
    interval: 0,
  };

  const estimatedGas = await ContractInstance.methods
    .createProduct(
      firstProduct.id,
      firstProduct.price,
      firstProduct.initialInventory,
      firstProduct.supply,
      firstProduct.interval,
    )
    .estimateGas({
      from: accounts[0],
    });

  const gas = boostGas(estimatedGas);
  const obj = await ContractInstance.methods
    .createProduct(
      firstProduct.id,
      firstProduct.price,
      firstProduct.initialInventory,
      firstProduct.supply,
      firstProduct.interval,
    )
    .send({
      from: accounts[0],
      gas,
      // value: amountInWei,
      // to: contractAddress,
    });

  const p = await ContractInstance.methods.productInfo(firstProduct.id).call();
  console.log(p);
}

async function initEventListeners() {
  document.querySelector('#deploy').addEventListener('click', async () => {
    await deploy();
  });

  document.querySelector('#create-product').addEventListener('click', async () => {
    await createProduct();
  });
}

const getContractAddress = (contractInterface, currentNetwork) => {
  const network = currentNetwork.toString();
  return contractInterface.networks[network].address;
};

async function main() {
  await initWeb3();
  await initEventListeners();
}

main();