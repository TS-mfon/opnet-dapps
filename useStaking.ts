import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { networks } from '@btc-vision/bitcoin';
import {
    fetchVaultData,
    buildStakeTx,
    buildUnstakeTx,
    buildClaimRewardsTx,
    clearContractCache,
    parseAmount,
    type VaultStats,
} from '../services/StakingService';
import { getVaultAddress } from '../config/networks';

const POLL_INTERVAL = 15_000; // 15 seconds

export interface UseStakingReturn {
    stats: VaultStats | null;
    loading: boolean;
    txLoading: boolean;
    error: string | null;
    txError: string | null;
    txHash: string | null;
    vaultDeployed: boolean;
    stake: (amount: string) => Promise<void>;
    unstake: (amount: string) => Promise<void>;
    claimRewards: () => Promise<void>;
    refresh: () => Promise<void>;
    clearTxState: () => void;
}

export function useStaking(): UseStakingReturn {
    const { walletAddress, provider, signer, network } = useWalletConnect();
    const [stats, setStats] = useState<VaultStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [txLoading, setTxLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txError, setTxError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentNetwork = network?.network ?? networks.regtest;

    const vaultAddress = getVaultAddress(currentNetwork);
    const vaultDeployed = Boolean(vaultAddress);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchVaultData(currentNetwork, walletAddress ?? undefined);
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load vault data');
        } finally {
            setLoading(false);
        }
    }, [currentNetwork, walletAddress]);

    // Auto-refresh on network/wallet change
    useEffect(() => {
        clearContractCache();
        void refresh();

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => { void refresh(); }, POLL_INTERVAL);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [refresh]);

    const sendTx = useCallback(async (simulation: unknown): Promise<string> => {
        if (!provider || !walletAddress) throw new Error('Wallet not connected');

        // The wallet (OP_WALLET) handles signing - signer/mldsaSigner are null on frontend
        const result = await (provider as unknown as {
            sendTransaction(sim: unknown, options: { signer: null; mldsaSigner: null }): Promise<{ txid?: string; hash?: string }>
        }).sendTransaction(simulation, { signer: null, mldsaSigner: null });

        return result.txid ?? result.hash ?? '';
    }, [provider, walletAddress]);

    const stake = useCallback(async (amount: string) => {
        if (!walletAddress) throw new Error('Wallet not connected');
        setTxLoading(true);
        setTxError(null);
        setTxHash(null);
        try {
            const amountBig = parseAmount(amount);
            const simulation = await buildStakeTx(currentNetwork, walletAddress, amountBig);
            const hash = await sendTx(simulation);
            setTxHash(hash);
            setTimeout(() => void refresh(), 3000);
        } catch (err) {
            setTxError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setTxLoading(false);
        }
    }, [walletAddress, currentNetwork, sendTx, refresh]);

    const unstake = useCallback(async (amount: string) => {
        if (!walletAddress) throw new Error('Wallet not connected');
        setTxLoading(true);
        setTxError(null);
        setTxHash(null);
        try {
            const amountBig = parseAmount(amount);
            const simulation = await buildUnstakeTx(currentNetwork, walletAddress, amountBig);
            const hash = await sendTx(simulation);
            setTxHash(hash);
            setTimeout(() => void refresh(), 3000);
        } catch (err) {
            setTxError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setTxLoading(false);
        }
    }, [walletAddress, currentNetwork, sendTx, refresh]);

    const claimRewards = useCallback(async () => {
        if (!walletAddress) throw new Error('Wallet not connected');
        setTxLoading(true);
        setTxError(null);
        setTxHash(null);
        try {
            const simulation = await buildClaimRewardsTx(currentNetwork, walletAddress);
            const hash = await sendTx(simulation);
            setTxHash(hash);
            setTimeout(() => void refresh(), 3000);
        } catch (err) {
            setTxError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setTxLoading(false);
        }
    }, [walletAddress, currentNetwork, sendTx, refresh]);

    const clearTxState = useCallback(() => {
        setTxHash(null);
        setTxError(null);
    }, []);

    return {
        stats,
        loading,
        txLoading,
        error,
        txError,
        txHash,
        vaultDeployed,
        stake,
        unstake,
        claimRewards,
        refresh,
        clearTxState,
    };
}
