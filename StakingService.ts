import { getContract, JSONRpcProvider } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { Network, networks } from '@btc-vision/bitcoin';
import { STAKING_VAULT_ABI } from '../abi/StakingVault';
import { getNetworkConfig, getVaultAddress } from '../config/networks';

export interface VaultStats {
    totalStaked: bigint;
    apy: number; // percentage e.g. 10.5
    userStaked: bigint;
    userRewards: bigint;
}

// Provider singleton cache
const providerCache = new Map<string, JSONRpcProvider>();

function getProvider(network: Network): JSONRpcProvider {
    const config = getNetworkConfig(network);
    const cached = providerCache.get(config.rpcUrl);
    if (cached) return cached;
    const provider = new JSONRpcProvider({ url: config.rpcUrl, network });
    providerCache.set(config.rpcUrl, provider);
    return provider;
}

// Contract instance cache
const contractCache = new Map<string, ReturnType<typeof getContract>>();

function getVaultContract(vaultAddress: string, network: Network, userAddress?: string) {
    const cacheKey = `${vaultAddress}-${network}-${userAddress ?? 'anon'}`;
    const cached = contractCache.get(cacheKey);
    if (cached) return cached;

    const provider = getProvider(network);
    const address = Address.fromString(vaultAddress);

    const contract = getContract(
        address,
        STAKING_VAULT_ABI as unknown as never[],
        provider,
        network,
        userAddress ? userAddress : undefined
    );

    contractCache.set(cacheKey, contract);
    return contract;
}

export function clearContractCache(): void {
    contractCache.clear();
    providerCache.clear();
}

/**
 * Fetch vault stats and user data in one batched call.
 */
export async function fetchVaultData(
    network: Network,
    userAddress?: string
): Promise<VaultStats> {
    const vaultAddress = getVaultAddress(network);
    if (!vaultAddress) {
        return { totalStaked: 0n, apy: 10, userStaked: 0n, userRewards: 0n };
    }

    const contract = getVaultContract(vaultAddress, network, userAddress);

    try {
        // Batch read calls
        const [totalStakedRes, apyRes] = await Promise.all([
            (contract as unknown as { totalStaked(): Promise<{ properties: { total: bigint } }> }).totalStaked(),
            (contract as unknown as { apy(): Promise<{ properties: { apy: bigint } }> }).apy(),
        ]);

        let userStaked = 0n;
        let userRewards = 0n;

        if (userAddress) {
            const [stakedRes, rewardsRes] = await Promise.all([
                (contract as unknown as { stakedBalance(addr: string): Promise<{ properties: { balance: bigint } }> })
                    .stakedBalance(userAddress),
                (contract as unknown as { pendingRewards(addr: string): Promise<{ properties: { rewards: bigint } }> })
                    .pendingRewards(userAddress),
            ]);
            userStaked = stakedRes.properties.balance;
            userRewards = rewardsRes.properties.rewards;
        }

        const rawApy = apyRes.properties.apy; // 1e6 precision, 100000 = 10%
        const apyPercent = Number(rawApy) / 10000; // convert to percentage

        return {
            totalStaked: totalStakedRes.properties.total,
            apy: apyPercent,
            userStaked,
            userRewards,
        };
    } catch (err) {
        console.error('Failed to fetch vault data:', err);
        return { totalStaked: 0n, apy: 10, userStaked: 0n, userRewards: 0n };
    }
}

/**
 * Build stake transaction calldata.
 * Returns the interaction object ready for wallet signing.
 */
export async function buildStakeTx(
    network: Network,
    userAddress: string,
    amount: bigint
) {
    const vaultAddress = getVaultAddress(network);
    if (!vaultAddress) throw new Error('Vault not deployed on this network');

    const contract = getVaultContract(vaultAddress, network, userAddress);

    // Simulate first (MANDATORY per OPNet rules)
    const simulation = await (contract as unknown as {
        stake(forAddr: string, amount: bigint): Promise<unknown>
    }).stake(userAddress, amount);

    return simulation;
}

/**
 * Build unstake transaction calldata.
 */
export async function buildUnstakeTx(
    network: Network,
    userAddress: string,
    amount: bigint
) {
    const vaultAddress = getVaultAddress(network);
    if (!vaultAddress) throw new Error('Vault not deployed on this network');

    const contract = getVaultContract(vaultAddress, network, userAddress);

    const simulation = await (contract as unknown as {
        unstake(forAddr: string, amount: bigint): Promise<unknown>
    }).unstake(userAddress, amount);

    return simulation;
}

/**
 * Build claim rewards transaction.
 */
export async function buildClaimRewardsTx(
    network: Network,
    userAddress: string
) {
    const vaultAddress = getVaultAddress(network);
    if (!vaultAddress) throw new Error('Vault not deployed on this network');

    const contract = getVaultContract(vaultAddress, network, userAddress);

    const simulation = await (contract as unknown as {
        claimRewards(forAddr: string): Promise<unknown>
    }).claimRewards(userAddress);

    return simulation;
}

/**
 * Format a bigint token amount with decimals.
 */
export function formatAmount(amount: bigint, decimals: number = 8): string {
    if (amount === 0n) return '0.00';
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const frac = amount % divisor;
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4);
    return `${whole.toLocaleString()}.${fracStr}`;
}

/**
 * Parse a token amount string to bigint.
 */
export function parseAmount(value: string, decimals: number = 8): bigint {
    const [whole, frac = ''] = value.split('.');
    const fracPadded = frac.slice(0, decimals).padEnd(decimals, '0');
    return BigInt(whole + fracPadded);
}
