import { WalletConnectButton } from './components/WalletConnect';
import { StakingPanel } from './components/StakingPanel';
import { VaultStats } from './components/VaultStats';

export default function App() {
    return (
        <div className="app">
            <div className="grid-texture" aria-hidden="true"></div>

            <nav className="navbar" role="navigation" aria-label="Main navigation">
                <a href="/" className="navbar__logo" aria-label="VaultX home">
                    <div className="navbar__logo-icon" aria-hidden="true">V</div>
                    <span>VaultX</span>
                </a>
                <div className="navbar__right">
                    <WalletConnectButton />
                </div>
            </nav>

            <header className="hero" role="banner">
                <div className="hero__eyebrow">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="5" r="5"/>
                    </svg>
                    Bitcoin-Native Yield
                </div>
                <h1 className="hero__title">
                    Stake BTC,{' '}
                    <span className="accent">Earn On-Chain</span>
                </h1>
                <p className="hero__subtitle">
                    VaultX is a non-custodial staking vault built on OPNet — the smart contract
                    layer on Bitcoin Layer 1. No bridges. No wrapped tokens. Pure BTC yield.
                </p>
            </header>

            <section className="stats-bar" aria-label="Protocol statistics">
                <div className="stats-bar__item">
                    <span className="stats-bar__value">10.0%</span>
                    <span className="stats-bar__label">Base APY</span>
                </div>
                <div className="stats-bar__item">
                    <span className="stats-bar__value">0</span>
                    <span className="stats-bar__label">Lock Period (Days)</span>
                </div>
                <div className="stats-bar__item">
                    <span className="stats-bar__value">BTC L1</span>
                    <span className="stats-bar__label">Network</span>
                </div>
                <div className="stats-bar__item">
                    <span className="stats-bar__value">OPNet</span>
                    <span className="stats-bar__label">Protocol</span>
                </div>
            </section>

            <main className="vault-section" role="main">
                <div className="vault-grid">
                    <div>
                        <VaultStats />
                    </div>
                    <div>
                        <StakingPanel />
                    </div>
                </div>
            </main>

            <section className="how-it-works" aria-label="How it works">
                <h2 className="section-title">How VaultX Works</h2>
                <div className="steps-grid">
                    <article className="step-card">
                        <div className="step-number">1</div>
                        <h3>Connect OP_WALLET</h3>
                        <p>Connect your OP_WALLET extension. Your keys stay in your wallet — we never have custody of your funds.</p>
                    </article>
                    <article className="step-card">
                        <div className="step-number">2</div>
                        <h3>Stake sBTC</h3>
                        <p>Deposit sBTC into the OPNet smart contract vault. Rewards accrue every second at the current APY rate.</p>
                    </article>
                    <article className="step-card">
                        <div className="step-number">3</div>
                        <h3>Claim Yield</h3>
                        <p>Claim accumulated rewards anytime with zero lock-up periods. Unstake partially or fully whenever you choose.</p>
                    </article>
                </div>
            </section>

            <footer className="footer" role="contentinfo">
                <div className="footer__copy">
                    VaultX &copy; {new Date().getFullYear()} — Built on OPNet / Bitcoin L1
                </div>
                <nav className="footer__links" aria-label="Footer links">
                    <a href="https://opnet.org" target="_blank" rel="noopener noreferrer" className="footer__link">OPNet Docs</a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer__link">GitHub</a>
                    <a href="https://explorer.opnet.org" target="_blank" rel="noopener noreferrer" className="footer__link">Explorer</a>
                </nav>
            </footer>
        </div>
    );
}
