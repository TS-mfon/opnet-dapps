import { useState, useCallback } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useStaking } from '../hooks/useStaking';
import { formatAmount } from '../utils/formatting';

export function StakingPanel() {
    const { walletAddress, openConnectModal } = useWalletConnect();
    const {
        stats,
        loading,
        txLoading,
        txError,
        txHash,
        vaultDeployed,
        stake,
        unstake,
        claimRewards,
        clearTxState,
    } = useStaking();

    const [tab, setTab] = useState<'stake' | 'unstake'>('stake');
    const [amount, setAmount] = useState('');

    const maxStaked = stats?.userStaked ?? 0n;

    const handlePct = useCallback((pct: number) => {
        if (pct === 100 && tab === 'unstake' && maxStaked > 0n) {
            setAmount(formatAmount(maxStaked).replace(',', ''));
        } else {
            // For stake, pct buttons set example amounts
            const examples: Record<number, string> = { 25: '0.0025', 50: '0.005', 75: '0.0075', 100: '0.01' };
            setAmount(examples[pct] ?? '');
        }
    }, [tab, maxStaked]);

    const handleSubmit = useCallback(async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        clearTxState();
        if (tab === 'stake') {
            await stake(amount);
        } else {
            await unstake(amount);
        }
        setAmount('');
    }, [amount, tab, stake, unstake, clearTxState]);

    const handleClaim = useCallback(async () => {
        clearTxState();
        await claimRewards();
    }, [claimRewards, clearTxState]);

    if (!vaultDeployed) {
        return (
            <div className="deploy-notice">
                <div className="deploy-notice__title">Contract Not Yet Deployed</div>
                <p className="deploy-notice__text">
                    Deploy the StakingVault contract and update <code>CONTRACT_ADDRESSES</code> in
                    <code> src/config/networks.ts</code> to enable staking.
                </p>
            </div>
        );
    }

    return (
        <div className="card card--glow fade-in">
            <div className="card__header">
                <span className="card__title">Staking Vault</span>
                {stats && (
                    <span className="card__badge">{stats.apy.toFixed(1)}% APY</span>
                )}
            </div>

            {/* User position summary */}
            {walletAddress && stats && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div className="info-row">
                        <span className="info-row__key">Your Staked</span>
                        <span className="info-row__val">{formatAmount(stats.userStaked)} sBTC</span>
                    </div>
                    <div className="info-row">
                        <span className="info-row__key">Pending Rewards</span>
                        <span className="info-row__val info-row__val--green">
                            + {formatAmount(stats.userRewards)} sBTC
                        </span>
                    </div>
                </div>
            )}

            {/* Rewards claim */}
            {walletAddress && stats && stats.userRewards > 0n && (
                <div className="rewards-card card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                CLAIMABLE REWARDS
                            </div>
                            <div className="rewards-value">{formatAmount(stats.userRewards)} sBTC</div>
                        </div>
                        <button
                            className="btn btn--primary"
                            onClick={handleClaim}
                            disabled={txLoading}
                            aria-label="Claim rewards"
                        >
                            {txLoading ? (
                                <><span className="btn__spinner"></span> Claiming...</>
                            ) : 'Claim'}
                        </button>
                    </div>
                </div>
            )}

            <div className="tabs" role="tablist">
                <button
                    className={`tab ${tab === 'stake' ? 'tab--active' : ''}`}
                    onClick={() => { setTab('stake'); setAmount(''); clearTxState(); }}
                    role="tab"
                    aria-selected={tab === 'stake'}
                >
                    Stake
                </button>
                <button
                    className={`tab ${tab === 'unstake' ? 'tab--active' : ''}`}
                    onClick={() => { setTab('unstake'); setAmount(''); clearTxState(); }}
                    role="tab"
                    aria-selected={tab === 'unstake'}
                >
                    Unstake
                </button>
            </div>

            <div className="stake-form">
                <div className="input-group">
                    <label className="input-label" htmlFor="stake-amount">Amount</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            id="stake-amount"
                            className="input-field"
                            type="number"
                            step="0.00000001"
                            min="0"
                            placeholder="0.00000000"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ paddingRight: '60px' }}
                            aria-label="Amount to stake or unstake"
                        />
                        <span className="input-field-suffix">sBTC</span>
                    </div>
                    <div className="input-actions">
                        {[25, 50, 75, 100].map(pct => (
                            <button
                                key={pct}
                                className="pct-btn"
                                onClick={() => handlePct(pct)}
                                aria-label={`${pct}% of max`}
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fee estimate */}
                {amount && parseFloat(amount) > 0 && (
                    <div className="info-row" style={{ padding: '6px 0', borderBottom: 'none' }}>
                        <span className="info-row__key">Estimated Annual Yield</span>
                        <span className="info-row__val info-row__val--green">
                            +{((parseFloat(amount) * (stats?.apy ?? 10)) / 100).toFixed(6)} sBTC
                        </span>
                    </div>
                )}

                {walletAddress ? (
                    <button
                        className="btn btn--primary btn--full btn--lg"
                        onClick={handleSubmit}
                        disabled={txLoading || !amount || parseFloat(amount) <= 0}
                        aria-label={tab === 'stake' ? 'Stake tokens' : 'Unstake tokens'}
                    >
                        {txLoading ? (
                            <><span className="btn__spinner"></span> Confirming in wallet...</>
                        ) : (
                            tab === 'stake' ? 'Stake sBTC' : 'Unstake sBTC'
                        )}
                    </button>
                ) : (
                    <button
                        className="btn btn--secondary btn--full btn--lg"
                        onClick={openConnectModal}
                        aria-label="Connect wallet to stake"
                    >
                        Connect Wallet to Stake
                    </button>
                )}

                {/* TX feedback */}
                {txHash && (
                    <div className="alert alert--success" role="status">
                        <span className="alert__icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <div>
                            Transaction submitted!
                            <div className="tx-hash">TX: {txHash}</div>
                        </div>
                    </div>
                )}

                {txError && (
                    <div className="alert alert--error" role="alert">
                        <span className="alert__icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </span>
                        {txError}
                    </div>
                )}

                {!walletAddress && (
                    <div className="alert alert--info" role="note">
                        <span className="alert__icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </span>
                        Connect your OP_WALLET to stake tokens on OPNet.
                    </div>
                )}
            </div>

            {loading && !stats && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                    <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '8px' }}></div>
                    <div className="skeleton" style={{ height: '16px', width: '40%' }}></div>
                </div>
            )}
        </div>
    );
}
