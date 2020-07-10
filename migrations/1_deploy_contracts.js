const DistributeRewards = artifacts.require('DistributeRewards');

module.exports = async (deployer) => {
  await deployer.deploy(DistributeRewards, '');
};
