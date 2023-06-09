import {toNano, WalletTypes} from "locklift";
import {TokenRootUpgradeableAbi} from "../../build/factorySource";
import {deployShopFactory} from "../../test/utils/common";


export default async () => {
  const signer = await locklift.keystore.getSigner("0");
  const usdt = await locklift.deployments.getContract<TokenRootUpgradeableAbi>("USDT");
  const owner = await locklift.deployments.getAccount("Owner");
  const shop_factory = await deployShopFactory(owner.account.address, usdt.address);

  await locklift.deployments.saveContract({
    deploymentName: 'factory',
    address: shop_factory.address,
    contractName: 'ShopFactory'
  })
};

export const tag = "factory";