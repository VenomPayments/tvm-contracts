import {Token} from "./wrappers/token";
import {Address, Contract, getRandomNonce, toNano, WalletTypes, zeroAddress} from "locklift";
import {Account} from 'locklift/everscale-client'
import Bignumber from "bignumber.js";
import {ShopFactoryAbi} from "../../build/factorySource";

const logger = require("mocha-logger");
const {expect} = require("chai");


export function isNumeric(value: string) {
    return /\d+$/.test(value);
}

export const isValidEverAddress = (address: string) => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);


export async function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function bn(num: number | string) {
    return new Bignumber(num);
}

export function toUSD(num: Bignumber | number) {
    const val = num.toString();
    return bn(val).div(10**6).toFixed(5);
}

export async function tryIncreaseTime(seconds: number) {
    // @ts-ignore
    if (locklift.testing.isEnabled) {
        await locklift.testing.increaseTime(seconds);
    } else {
        await sleep(seconds * 1000);
    }
}


export const deployUser = async function (initial_balance = 100, log=true): Promise<Account> {
    const signer = await locklift.keystore.getSigner('0');

    const {account: _user, tx} = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.EverWallet,
        //Value which will send to the new account from a giver
        value: toNano(initial_balance),
        publicKey: signer?.publicKey as string
    });

    if (log) logger.log(`User address: ${_user.address.toString()}`);
    return _user;
}


export const setupTokenRoot = async function (token_name: string, token_symbol: string, owner: Account, decimals=9) {
    const signer = await locklift.keystore.getSigner('0');
    const TokenPlatform = await locklift.factory.getContractArtifacts('TokenWalletPlatform');

    const TokenWallet = await locklift.factory.getContractArtifacts('TokenWalletUpgradeable');
    const {contract: _root, tx} = await locklift.tracing.trace(locklift.factory.deployContract({
        contract: 'TokenRootUpgradeable',
        initParams: {
            name_: token_name,
            symbol_: token_symbol,
            decimals_: decimals,
            rootOwner_: owner.address,
            walletCode_: TokenWallet.code,
            randomNonce_: getRandomNonce(),
            deployer_: zeroAddress,
            platformCode_: TokenPlatform.code
        },
        publicKey: signer?.publicKey as string,
        constructorParams: {
            initialSupplyTo: zeroAddress,
            initialSupply: 0,
            deployWalletValue: 0,
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: owner.address
        },
        value: locklift.utils.toNano(2)
    }));

    logger.log(`Token root address: ${_root.address.toString()}`);

    expect(Number(await locklift.provider.getBalance(_root.address))).to.be.above(0, 'Root balance empty');
    return new Token(_root, owner);
}

export const deployShopFactory = async function(owner: Address, launcher_pubkey: string, usdt: Address): Promise<Contract<ShopFactoryAbi>> {
    const signer = await locklift.keystore.getSigner('0');
    const Shop = await locklift.factory.getContractArtifacts('Shop');
    const Platform = await locklift.factory.getContractArtifacts('Platform');

    const {contract: _root, tx} = await locklift.tracing.trace(locklift.factory.deployContract({
        contract: 'ShopFactory',
        initParams: {
            deploy_nonce: getRandomNonce(),
            shopCode: Shop.code,
            platformCode: Platform.code
        },
        constructorParams: {
            _owner: owner,
            _usdt: usdt,
        },
        publicKey: signer?.publicKey as string,
        value: toNano(5)
    }));

    return _root;
}