import { networks, Network } from '@btc-vision/bitcoin';

export interface NetworkConfig {
    name: string;
    rpcUrl: string;
    explorerUrl: string;
}

export const NETWORK_CONFIGS: Map<string, NetworkConfig> = new Map([
    ['mainnet', {
        name: 'Bitcoin Mainnet',
        rpcUrl: 'https://mainnet.opnet.org',
        explorerUrl: 'https://explorer.opnet.org',
    }],
    ['testnet', {
        name: 'OPNet Testnet',
        rpcUrl: 'https://testnet.opnet.org',
        explorerUrl: 'https://testnet-explorer.opnet.org',
    }],
    ['regtest', {
        name: 'Regtest (Local)',
        rpcUrl: 'http://localhost:9001',
        explorerUrl: 'http://localhost:3000',
    }],
]);

// UPDATE THESE after deploying the contract
export const CONTRACT_ADDRESSES: Record<string, { vault: string }> = {
    mainnet: { vault: '' },
    testnet: { vault: '' },
    regtest: { vault: '' },
};

export function getNetworkName(network: Network): string {
    if (network === networks.bitcoin) return 'mainnet';
    if (network === networks.opnetTestnet) return 'testnet';
    if (network === networks.regtest) return 'regtest';
    return 'regtest';
}

export function getNetworkConfig(network: Network): NetworkConfig {
    const name = getNetworkName(network);
    return NETWORK_CONFIGS.get(name) ?? NETWORK_CONFIGS.get('regtest')!;
}

export function getVaultAddress(network: Network): string {
    const name = getNetworkName(network);
    return CONTRACT_ADDRESSES[name]?.vault ?? '';
}
