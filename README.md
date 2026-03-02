# 🔒 OPNet Staking Vault

A production-grade staking vault DApp built on OPNet (Bitcoin-native smart contracts). Stake tokens, earn rewards, and interact with the vault via a sleek dark-mode UI.

## Stack

- **Smart Contract**: AssemblyScript → WebAssembly (OPNet)
- **Frontend**: React 18 + Vite + TypeScript
- **Wallet**: OP_WALLET via `@btc-vision/walletconnect`
- **Network**: Bitcoin (mainnet / testnet / regtest)

## Quick Start

```bash
# Install everything
npm run install:all

# Build the contract (produces contract/build/StakingVault.wasm)
npm run build:contract

# Run the frontend
npm run dev:frontend
```

## Structure

```
contract/          Smart contract (AssemblyScript)
frontend/          React DApp
INTEGRATION_GUIDE.md  Full deployment & linking guide
```

## Deploy

1. Build the contract: `npm run build:contract`
2. Deploy `contract/build/StakingVault.wasm` via OP_WALLET
3. Update addresses in `frontend/src/config/contracts.ts`
4. Deploy frontend to Vercel (root dir: `frontend`)

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for the complete step-by-step guide.

## Contract Interface

| Method | Description |
|--------|-------------|
| `stake(amount)` | Stake tokens (requires prior approval) |
| `unstake(amount)` | Unstake + auto-claim rewards |
| `claimRewards()` | Claim pending rewards only |
| `getStakedBalance(user)` | Read staked balance |
| `getPendingRewards(user)` | Read pending rewards |
| `getTotalStaked()` | Protocol TVL |
| `getUserInfo(user)` | Full user position |

## License

MIT
