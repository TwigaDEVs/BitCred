import { Contract, Account, RpcProvider } from 'starknet';

export const VESU_ADDRESSES = {
  SINGLETON: '0x2545b2e5d519fc230e9cd781046d3a64e092114f07e44771e0d719d148725ef',
  USDC: '0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080',
  WBTC: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
} as const;

export const VESU_POOL_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
      { name: 'receiver', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'external',
  },
  {
    name: 'borrow',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
      { name: 'receiver', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'external',
  },
  {
    name: 'repay',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'external',
  },
  {
    name: 'withdraw',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
      { name: 'receiver', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'external',
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
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
] as const;

export interface VesuPosition {
  collateral_btc: number;
  debt_usdc: number;
  collateral_raw: string;
  debt_raw: string;
}

export class VesuService {
  private provider: RpcProvider;
  
  constructor(provider: RpcProvider) {
    this.provider = provider;
  }

  async depositCollateral(account: Account, amountBTC: number) {
    const wbtcContract = new Contract({ abi: ERC20_ABI, address: VESU_ADDRESSES.WBTC, providerOrAccount: account});
    const poolContract = new Contract({ abi: VESU_POOL_ABI, address: VESU_ADDRESSES.SINGLETON, providerOrAccount: account});
    
    const amount = BigInt(Math.floor(amountBTC * 1e8)); // 8 decimals for WBTC
    
    // 1. Approve Vesu to spend WBTC
    const approveTx = await wbtcContract.approve(VESU_ADDRESSES.SINGLETON, { low: amount, high: BigInt(0) });
    await this.provider.waitForTransaction(approveTx.transaction_hash);
    
    // 2. Deposit to Vesu
    const depositTx = await poolContract.deposit(
      VESU_ADDRESSES.WBTC,
      { low: amount, high: BigInt(0) },
      account.address
    );
    
    return depositTx.transaction_hash;
  }

  async borrow(account: Account, amountUSDC: number) {
    const poolContract = new Contract({ abi: VESU_POOL_ABI, address: VESU_ADDRESSES.SINGLETON, providerOrAccount: account});
    
    const amount = BigInt(Math.floor(amountUSDC * 1e6)); // 6 decimals for USDC
    
    const tx = await poolContract.borrow(
      VESU_ADDRESSES.USDC,
      { low: amount, high: BigInt(0) },
      account.address
    );
    
    return tx.transaction_hash;
  }

  async repay(account: Account, amountUSDC: number) {
    const usdcContract = new Contract({ abi: ERC20_ABI, address: VESU_ADDRESSES.USDC, providerOrAccount: account});
    const poolContract = new Contract({ abi: VESU_POOL_ABI, address: VESU_ADDRESSES.SINGLETON, providerOrAccount: account});
    
    const amount = BigInt(Math.floor(amountUSDC * 1e6));
    
    // 1. Approve Vesu to spend USDC
    const approveTx = await usdcContract.approve(VESU_ADDRESSES.SINGLETON, { low: amount, high: BigInt(0) });
    await this.provider.waitForTransaction(approveTx.transaction_hash);
    
    // 2. Repay to Vesu
    const repayTx = await poolContract.repay(
      VESU_ADDRESSES.USDC,
      { low: amount, high: BigInt(0) }
    );
    
    return repayTx.transaction_hash;
  }

  async withdraw(account: Account, amountBTC: number) {
    const poolContract = new Contract({ abi: VESU_POOL_ABI, address: VESU_ADDRESSES.SINGLETON, providerOrAccount: account});
    
    const amount = BigInt(Math.floor(amountBTC * 1e8));
    
    const tx = await poolContract.withdraw(
      VESU_ADDRESSES.WBTC,
      { low: amount, high: BigInt(0) },
      account.address
    );
    
    return tx.transaction_hash;
  }
}