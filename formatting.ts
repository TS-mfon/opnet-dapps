export function formatAddress(address: string): string {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function formatAmount(amount: bigint, decimals: number = 8): string {
    if (amount === 0n) return '0.0000';
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const frac = amount % divisor;
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4);
    return `${whole.toLocaleString()}.${fracStr}`;
}

export function formatAPY(apy: number): string {
    return `${apy.toFixed(2)}%`;
}

export function formatUSD(amount: bigint, btcPrice: number = 65000, decimals: number = 8): string {
    const btcAmount = Number(amount) / 10 ** decimals;
    const usd = btcAmount * btcPrice;
    if (usd < 0.01) return '$0.00';
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTVL(amount: bigint, decimals: number = 8): string {
    const value = Number(amount) / 10 ** decimals;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(4);
}
