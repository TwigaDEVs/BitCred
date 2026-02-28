import { Contract, Account, RpcProvider } from 'starknet';

export const VESU_ADDRESSES = {
  SINGLETON: '0x4b4dcc1bb1d3ec53f2edb298955a26e4a8f1c37861dde272b84a74d696817e7',
  USDC:      '0x4b8c72d85606ac29871d217377294d4690674459c7cf8ba73164388095e798d',
  WBTC:      '0x2d5b244adea042de49a08126d95a1860c0a2617f37b330a8fe09de37a86559',
} as const;

export const LENDING_POOL_ABI = [
  {
    name: 'deposit_collateral',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'core::integer::u256' },
      { name: 'btc_address_hash', type: 'core::felt252' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'borrow',
    type: 'function',
    inputs: [{ name: 'amount', type: 'core::integer::u256' }],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'repay',
    type: 'function',
    inputs: [{ name: 'amount', type: 'core::integer::u256' }],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'get_position',
    type: 'function',
    inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [
      { name: 'collateral',      type: 'core::integer::u256' },
      { name: 'debt',            type: 'core::integer::u256' },
      { name: 'ratio',           type: 'core::integer::u32' },
      { name: 'is_liquidatable', type: 'core::bool'}
    ],
    state_mutability: 'view',
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount',  type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
  {
    name: 'balance_of',
    type: 'function',
    inputs: [{ name: 'account', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
  {
    name: 'claim',
    type: 'function',
    inputs: [],
    outputs: [],
    state_mutability: 'external',
  },
] as const;

export interface VesuPosition {
  collateral_btc: number;
  debt_usdc:      number;
  collateral_raw: string;
  debt_raw:       string;
}

export class VesuService {
  private provider: RpcProvider;

  constructor(provider: RpcProvider) {
    this.provider = provider;
  }

  async depositCollateral(account: Account, amountBTC: number, btcAddressHash: string) {
    // ✅ v6 constructor: Contract(abi, address, providerOrAccount)
    const wbtcContract    = new Contract({ abi: ERC20_ABI, address: VESU_ADDRESSES.WBTC, providerOrAccount: account });
    const lendingContract = new Contract({abi: LENDING_POOL_ABI,  address:VESU_ADDRESSES.SINGLETON,  providerOrAccount: account});

    const amount = BigInt(Math.floor(amountBTC * 1e8));

    // 1. Approve lending pool to spend WBTC
    const approveTx = await wbtcContract.invoke('approve', [
      VESU_ADDRESSES.SINGLETON,
      amount,
    ]);
    await this.provider.waitForTransaction(approveTx.transaction_hash);

    // 2. Deposit collateral
    const depositTx = await lendingContract.invoke('deposit_collateral', [
      BigInt(Math.floor(amountBTC * 1e8)),
      btcAddressHash,
    ]);
    await this.provider.waitForTransaction(depositTx.transaction_hash);

    return depositTx.transaction_hash;
  }

  async borrow(account: Account, amountUSDC: number) {
    const lendingContract = new Contract({abi: LENDING_POOL_ABI,  address:VESU_ADDRESSES.SINGLETON,  providerOrAccount: account});

    const amount = BigInt(Math.floor(amountUSDC * 1e6));

    const tx = await lendingContract.invoke('borrow', [amount]);
    await this.provider.waitForTransaction(tx.transaction_hash);

    return tx.transaction_hash;
  }

  async repay(account: Account, amountUSDC: number) {
    const usdcContract    = new Contract({ abi: ERC20_ABI, address: VESU_ADDRESSES.USDC, providerOrAccount: account });
    const lendingContract = new Contract({abi: LENDING_POOL_ABI,  address:VESU_ADDRESSES.SINGLETON,  providerOrAccount: account});

    const amount = BigInt(Math.floor(amountUSDC * 1e6));

    // 1. Approve lending pool to spend USDC
    const approveTx = await usdcContract.invoke('approve', [
      VESU_ADDRESSES.SINGLETON,
      amount,
    ]);
    await this.provider.waitForTransaction(approveTx.transaction_hash);

    // 2. Repay
    const repayTx = await lendingContract.invoke('repay', [amount]);
    await this.provider.waitForTransaction(repayTx.transaction_hash);

    return repayTx.transaction_hash;
  }

  async getPosition(address: string): Promise<VesuPosition> {
    const result = await this.provider.callContract({
      contractAddress: VESU_ADDRESSES.SINGLETON,
      entrypoint: 'get_position',
      calldata: [address],
    }) as any;

    // result is [collateral_low, collateral_high, debt_low, debt_high, ratio, is_liquidatable]
    const collateral_raw = BigInt(result[0]).toString();
    const debt_raw       = BigInt(result[2]).toString();

    return {
      collateral_btc: Number(collateral_raw) / 1e8,
      debt_usdc:      Number(debt_raw)       / 1e6,
      collateral_raw,
      debt_raw,
    };
  }
}