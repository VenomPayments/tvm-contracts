import chai, {expect} from "chai";
import {Address, Contract, getRandomNonce, lockliftChai, Signer, toNano} from "locklift";
import {FactorySource, ShopAbi, ShopFactoryAbi, TokenRootUpgradeableAbi} from "../build/factorySource";
import {Account} from 'locklift/everscale-client';
import {Token} from "./utils/wrappers/token";
import {TokenWallet} from "./utils/wrappers/token_wallet";
import {bn} from "./utils/common";

let sample: Contract<FactorySource["Sample"]>;
let signer: Signer;

const logger = require("mocha-logger");
chai.use(lockliftChai);

describe('Testing liquidity pool mechanics', async function() {
  let user1: Account;
  let user2: Account;
  let owner: Account;

  const UP = 0;
  const DOWN = 1;

  let usdt_root: Token;
  const USDT_DECIMALS = 10 ** 6;

  let factory: Contract<ShopFactoryAbi>;
  let shop: Contract<ShopAbi>;

  let user1_usdt_wallet: TokenWallet;
  let user2_usdt_wallet: TokenWallet;
  let owner_usdt_wallet: TokenWallet;


  describe('Setup contracts', async function() {
    it('Run fixtures', async function() {
      await locklift.deployments.fixture();

      owner = locklift.deployments.getAccount('Owner').account;
      user1 = locklift.deployments.getAccount('User').account;
      user2 = locklift.deployments.getAccount('User1').account;

      factory = await locklift.deployments.getContract<ShopFactoryAbi>('factory');

      usdt_root = new Token(locklift.deployments.getContract<TokenRootUpgradeableAbi>('USDT'), owner);
      user1_usdt_wallet = await usdt_root.wallet(user1);
      user2_usdt_wallet = await usdt_root.wallet(user2);
      owner_usdt_wallet = await usdt_root.wallet(owner);
    });
  })


  describe('Running scenarios', async function() {
    it('Seller deploy shop', async function() {
        const call_id = getRandomNonce();
        const {traceTree} = await locklift.tracing.trace(factory.methods.deployShop({
          name: 'Test Shop', description: 'Best shop ever created!', meta: {call_id: call_id, send_gas_to: user1.address}
        }).send({from: user1.address, amount: toNano(2.5)}));

        expect(traceTree)
          .to.emit('ShopDeployed')
          .withNamedArgs({
            shop_ID: '1',
            shop_owner: user1.address.toString(),
            call_id: call_id.toString()
          });

      const event = traceTree?.findEventsForContract({name: 'ShopDeployed', contract: factory})[0];
        // @ts-ignore
        shop = await locklift.factory.getDeployedContract('Shop', event.shop);
    });

    it('Buyer pays for order', async function() {
      const amount = 1000000;
      const payload = await shop.methods.encodeTokenTransfer({orderId: 222, call_id: 123}).call();

      const {traceTree} = await locklift.tracing.trace(
        user2_usdt_wallet.transfer(amount, shop.address, payload.value0, toNano(2.5))
      );

      expect(traceTree)
        .to.emit('Payment')
        .withNamedArgs({
          call_id: '123',
          amount: amount.toString(),
          sender: user2.address.toString(),
          orderId: '222'
        });
    });

    it('Seller withdraws funds', async function() {
      const amount = 123;

      const {traceTree} = await locklift.tracing.trace(
        shop.methods.withdraw({
          amount: amount,
          meta: {call_id: 123, send_gas_to: owner.address}
        }).send({from: user1.address, amount: toNano(2.5)})
      );

      expect(traceTree)
        .to.emit('Withdraw')
        .withNamedArgs({
          call_id: '123',
          amount: amount.toString()
        });
    });
  });
});