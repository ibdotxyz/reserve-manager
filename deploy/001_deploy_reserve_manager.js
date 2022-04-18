const { ethers } = require('hardhat');

module.exports = async({
    getNamedAccounts,
    deployments,
    getChainId,
    getUnnamedAccounts,
}) => {
  const {deploy} = deployments;
  const {comptroller, deployer, multisig, usdcBurner, wrappedNative} = await getNamedAccounts();

  await deploy('ReserveManager', {
    from: deployer,
    args: [multisig, comptroller, usdcBurner, wrappedNative, usdc],
    log: true
  });
}
