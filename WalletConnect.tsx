import { useWalletConnect } from '@btc-vision/walletconnect';
import { formatAddress } from '../utils/formatting';
import { getNetworkName } from '../config/networks';
import { networks } from '@btc-vision/bitcoin';

export function WalletConnectButton() {
    const {
        walletAddress,
        network,
        connecting,
        openConnectModal,
        disconnect,
    } = useWalletConnect();

    const networkObj = network?.network ?? networks.regtest;
    const netName = getNetworkName(networkObj);

    if (connecting) {
        return (
            <button className="wallet-btn" disabled>
                <span className="btn__spinner" style={{ borderTopColor: 'white' }}></span>
                Connecting...
            </button>
        );
    }

    if (walletAddress) {
        return (
            <div className="navbar__right">
                <div className="network-badge">
                    <span className="network-badge__dot"></span>
                    {netName}
                </div>
                <button
                    className="wallet-connected"
                    onClick={disconnect}
                    title="Click to disconnect"
                    aria-label="Disconnect wallet"
                >
                    <div className="wallet-avatar">
                        {walletAddress.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="wallet-address">{formatAddress(walletAddress)}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 1l10 10M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <button
            className="wallet-btn"
            onClick={openConnectModal}
            aria-label="Connect wallet"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M15 3h6v6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 3L12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Connect Wallet
        </button>
    );
}
