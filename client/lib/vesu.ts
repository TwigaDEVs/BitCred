import { Contract, Account, RpcProvider } from 'starknet';
import { CONTRACTS } from './constants';

export const VESU_ADDRESSES = {
  SINGLETON: CONTRACTS.LENDING, 
  USDC: CONTRACTS.MOCK_USDC,     
  WBTC: CONTRACTS.MOCK_WBTC,     
} as const;

export const LENDING_POOL_ABI = [
  {
    name: 'deposit_collateral',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'borrow',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'repay',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'get_position',
    type: 'function',
    inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [
      { name: 'collateral', type: 'core::integer::u256' },
      { name: 'debt', type: 'core::integer::u256' },
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
    const wbtcContract = new Contract({ 
      abi: ERC20_ABI, 
      address: VESU_ADDRESSES.WBTC, 
      providerOrAccount: account
    });
    
    const lendingContract = new Contract({ 
      abi: LENDING_POOL_ABI, 
      address: VESU_ADDRESSES.SINGLETON, 
      providerOrAccount: account
    });
    
    const amount = BigInt(Math.floor(amountBTC * 1e8)); // 8 decimals for WBTC
    
    // 1. Approve LendingPool to spend WBTC
    const approveTx = await wbtcContract.approve(
      VESU_ADDRESSES.SINGLETON, 
      { low: amount, high: BigInt(0) }
    );
    await this.provider.waitForTransaction(approveTx.transaction_hash);
    
    // 2. Deposit to our LendingPool
    const depositTx = await lendingContract.deposit_collateral(
      { low: amount, high: BigInt(0) }
    );
    await this.provider.waitForTransaction(depositTx.transaction_hash);
    
    return depositTx.transaction_hash;
  }

  async borrow(account: Account, amountUSDC: number) {
    const lendingContract = new Contract({ 
      abi: LENDING_POOL_ABI, 
      address: VESU_ADDRESSES.SINGLETON, 
      providerOrAccount: account
    });
    
    const amount = BigInt(Math.floor(amountUSDC * 1e6)); // 6 decimals for USDC
    
    const tx = await lendingContract.borrow(
      { low: amount, high: BigInt(0) }
    );
    await this.provider.waitForTransaction(tx.transaction_hash);
    
    return tx.transaction_hash;
  }

  async repay(account: Account, amountUSDC: number) {
    const usdcContract = new Contract({ 
      abi: ERC20_ABI, 
      address: VESU_ADDRESSES.USDC, 
      providerOrAccount: account
    });
    
    const lendingContract = new Contract({ 
      abi: LENDING_POOL_ABI, 
      address: VESU_ADDRESSES.SINGLETON, 
      providerOrAccount: account
    });
    
    const amount = BigInt(Math.floor(amountUSDC * 1e6));
    
    // 1. Approve LendingPool to spend USDC
    const approveTx = await usdcContract.approve(
      VESU_ADDRESSES.SINGLETON, 
      { low: amount, high: BigInt(0) }
    );
    await this.provider.waitForTransaction(approveTx.transaction_hash);
    
    // 2. Repay to LendingPool
    const repayTx = await lendingContract.repay(
      { low: amount, high: BigInt(0) }
    );
    await this.provider.waitForTransaction(repayTx.transaction_hash);
    
    return repayTx.transaction_hash;
  }

  async getPosition(address: string): Promise<VesuPosition> {
    const lendingContract = new Contract({ 
      abi: LENDING_POOL_ABI, 
      address: VESU_ADDRESSES.SINGLETON, 
      providerOrAccount: this.provider
    });
    
    const result = await lendingContract.get_position(address);
    
    // Parse the result (adjust based on your actual return format)
    const collateral_raw = result[0]?.toString() || '0';
    const debt_raw = result[1]?.toString() || '0';
    
    // Convert from base units (8 decimals for WBTC, 6 for USDC)
    const collateral_btc = Number(collateral_raw) / 1e8;
    const debt_usdc = Number(debt_raw) / 1e6;
    
    return {
      collateral_btc,
      debt_usdc,
      collateral_raw,
      debt_raw,
    };
  }
}