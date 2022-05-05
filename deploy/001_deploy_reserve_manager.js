const { ethers } = require('hardhat');

module.exports = async({
    getNamedAccounts,
    deployments,
    getChainId,
    getUnnamedAccounts,
}) => {
  const {deploy} = deployments;
  const {comptroller, deployer, multisig, wrappedNative, usdc} = await getNamedAccounts();

  await deploy('ReserveManager', {
    from: deployer,
    args: [multisig, multisig, comptroller, wrappedNative, usdc],
    log: true
  });
}
