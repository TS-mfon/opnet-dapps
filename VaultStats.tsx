import { useStaking } from '../hooks/useStaking';
import { formatAmount, formatTVL } from '../utils/formatting';

export function VaultStats() {
    const { stats, loading } = useStaking();

    const Skeleton = ({ width = '80%' }: { width?: string }) => (
        <div className="skeleton" style={{ height: '2rem', width, borderRadius: 'var(--radius-sm)' }}></div>
    );

    return (
        <>
            {/* APY Card */}
            <div className="card fade-in">
                <div className="card__header">
                    <span className="card__title">Current APY</span>
                    <span className="card__badge">LIVE</span>
                </div>
                {loading && !stats ? (
                    <Skeleton width="60%" />
                ) : (
                    <div className="apy-display">
                        <span className="apy-display__number">
                            {stats ? stats.apy.toFixed(1) : '10.0'}
                        </span>
                        <span className="apy-display__unit">%</span>
                    </div>
                )}
                <div className="card__sub" style={{ marginTop: '8px' }}>
                    Annual percentage yield on staked sBTC
                </div>

                <div className="divider" style={{ margin: 'var(--space-lg) 0' }}></div>

                <div className="info-row">
                    <span className="info-row__key">Reward Token</span>
                    <span className="info-row__val">sBTC</span>
                </div>
                <div className="info-row">
                    <span className="info-row__key">Lock Period</span>
                    <span className="info-row__val info-row__val--green">None</span>
                </div>
                <div className="info-row">
                    <span className="info-row__key">Protocol</span>
                    <span className="info-row__val">OPNet (Bitcoin L1)</span>
                </div>
            </div>

            {/* TVL Card */}
            <div className="card fade-in" style={{ animationDelay: '100ms' }}>
                <div className="card__header">
                    <span className="card__title">Total Value Locked</span>
                </div>
                {loading && !stats ? (
                    <Skeleton />
                ) : (
                    <>
                        <div className="card__value">
                            {stats ? formatTVL(stats.totalStaked) : '0.0000'}
                        </div>
                        <div className="card__sub">sBTC staked in vault</div>
                    </>
                )}

                <div className="progress-container">
                    <div className="progress-label">
                        <span>Vault capacity</span>
                        <span>
                            {stats ? formatAmount(stats.totalStaked, 8) : '0'} / 21,000,000 sBTC
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: stats
                                    ? `${Math.min(100, Number(stats.totalStaked) / 21_000_000_00_000_000 * 100)}%`
                                    : '0%'
                            }}
                        ></div>
                    </div>
                </div>
            </div>
        </>
    );
}
