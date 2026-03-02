import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    OP_NET,
    Revert,
    SafeMath,
    Selector,
    StoredU256,
    AddressMemoryMap,
    StoredBoolean,
} from '@btc-vision/btc-runtime/runtime';

// Error codes
const ERR_ZERO_AMOUNT: string = 'StakingVault: amount must be > 0';
const ERR_INSUFFICIENT_STAKE: string = 'StakingVault: insufficient staked balance';
const ERR_PAUSED: string = 'StakingVault: contract is paused';
const ERR_NOT_OWNER: string = 'StakingVault: caller is not owner';
const ERR_ZERO_ADDRESS: string = 'StakingVault: zero address not allowed';

// Precision for APY calculation: 1e6 = 100%
const PRECISION: u256 = u256.fromU32(1_000_000);

// Seconds per year (approximate)
const SECONDS_PER_YEAR: u256 = u256.fromU64(31_536_000);

export class StakingVault extends OP_NET {
    // --- Selectors ---
    private readonly stakeSelector: Selector = encodeSelector('stake(address,uint256)');
    private readonly unstakeSelector: Selector = encodeSelector('unstake(address,uint256)');
    private readonly claimRewardsSelector: Selector = encodeSelector('claimRewards(address)');
    private readonly pendingRewardsSelector: Selector = encodeSelector('pendingRewards(address)');
    private readonly stakedBalanceSelector: Selector = encodeSelector('stakedBalance(address)');
    private readonly totalStakedSelector: Selector = encodeSelector('totalStaked()');
    private readonly apySelector: Selector = encodeSelector('apy()');
    private readonly pauseSelector: Selector = encodeSelector('pause()');
    private readonly unpauseSelector: Selector = encodeSelector('unpause()');
    private readonly setApySelector: Selector = encodeSelector('setApy(uint256)');
    private readonly tokenAddressSelector: Selector = encodeSelector('tokenAddress()');
    private readonly ownerSelector: Selector = encodeSelector('owner()');

    // --- Storage pointers ---
    private readonly totalStakedPointer: u16 = Blockchain.nextPointer;
    private readonly apyPointer: u16 = Blockchain.nextPointer;
    private readonly pausedPointer: u16 = Blockchain.nextPointer;
    private readonly tokenAddressPointer: u16 = Blockchain.nextPointer;
    private readonly ownerPointer: u16 = Blockchain.nextPointer;
    private readonly totalRewardsDistributedPointer: u16 = Blockchain.nextPointer;

    // Per-user storage
    private readonly stakedBalanceMapPointer: u16 = Blockchain.nextPointer;
    private readonly rewardDebtMapPointer: u16 = Blockchain.nextPointer;
    private readonly stakingTimestampMapPointer: u16 = Blockchain.nextPointer;
    private readonly unclaimedRewardsMapPointer: u16 = Blockchain.nextPointer;

    // --- Storage instances ---
    private readonly _totalStaked: StoredU256 = new StoredU256(this.totalStakedPointer, u256.Zero);
    private readonly _apy: StoredU256 = new StoredU256(this.apyPointer, u256.Zero);
    private readonly _paused: StoredBoolean = new StoredBoolean(this.pausedPointer, false);
    private readonly _totalRewardsDistributed: StoredU256 = new StoredU256(this.totalRewardsDistributedPointer, u256.Zero);

    // Maps
    private readonly _stakedBalances: AddressMemoryMap<Address, StoredU256> = new AddressMemoryMap<Address, StoredU256>(
        this.stakedBalanceMapPointer,
        Address.dead()
    );
    private readonly _rewardDebt: AddressMemoryMap<Address, StoredU256> = new AddressMemoryMap<Address, StoredU256>(
        this.rewardDebtMapPointer,
        Address.dead()
    );
    private readonly _stakingTimestamp: AddressMemoryMap<Address, StoredU256> = new AddressMemoryMap<Address, StoredU256>(
        this.stakingTimestampMapPointer,
        Address.dead()
    );
    private readonly _unclaimedRewards: AddressMemoryMap<Address, StoredU256> = new AddressMemoryMap<Address, StoredU256>(
        this.unclaimedRewardsMapPointer,
        Address.dead()
    );

    public constructor() {
        super();
    }

    public override onDeployment(_calldata: Calldata): void {
        const deployer = Blockchain.tx.sender;

        // Store owner
        const ownerStorage: StoredU256 = new StoredU256(this.ownerPointer, u256.Zero);
        ownerStorage.set(deployer.toU256());

        // Default APY: 10% = 100000 (using 1e6 precision)
        this._apy.set(u256.fromU32(100_000));
    }

    public override callMethod(calldata: Calldata): BytesWriter {
        const selector = calldata.readSelector();

        switch (selector) {
            case this.stakeSelector:
                return this.stake(calldata);
            case this.unstakeSelector:
                return this.unstake(calldata);
            case this.claimRewardsSelector:
                return this.claimRewards(calldata);
            case this.pendingRewardsSelector:
                return this.pendingRewards(calldata);
            case this.stakedBalanceSelector:
                return this.stakedBalance(calldata);
            case this.totalStakedSelector:
                return this.getTotalStaked(calldata);
            case this.apySelector:
                return this.getApy(calldata);
            case this.tokenAddressSelector:
                return this.getTokenAddress(calldata);
            case this.ownerSelector:
                return this.getOwner(calldata);
            case this.pauseSelector:
                return this.pause(calldata);
            case this.unpauseSelector:
                return this.unpause(calldata);
            case this.setApySelector:
                return this.setApy(calldata);
            default:
                return super.callMethod(calldata);
        }
    }

    // --- Private helpers ---

    private _requireNotPaused(): void {
        if (this._paused.get()) {
            throw new Revert(ERR_PAUSED);
        }
    }

    private _requireOwner(): void {
        const ownerStorage: StoredU256 = new StoredU256(this.ownerPointer, u256.Zero);
        const ownerU256 = ownerStorage.get();
        const callerU256 = Blockchain.tx.sender.toU256();
        if (!u256.eq(ownerU256, callerU256)) {
            throw new Revert(ERR_NOT_OWNER);
        }
    }

    private _getTokenAddressStorage(): StoredU256 {
        return new StoredU256(this.tokenAddressPointer, u256.Zero);
    }

    /**
     * Calculate pending rewards for a user based on elapsed time and APY.
     * rewards = stakedAmount * apy * elapsedSeconds / (SECONDS_PER_YEAR * PRECISION)
     */
    private _calculatePendingRewards(user: Address): u256 {
        const stakedEntry = this._stakedBalances.get(user);
        const staked = stakedEntry.get();

        if (u256.eq(staked, u256.Zero)) {
            return u256.Zero;
        }

        const tsEntry = this._stakingTimestamp.get(user);
        const stakeTime = tsEntry.get();
        const now = u256.fromU64(Blockchain.block.timestamp);

        if (u256.gte(stakeTime, now)) {
            return u256.Zero;
        }

        const elapsed = SafeMath.sub(now, stakeTime);
        const apy = this._apy.get();

        // rewards = staked * apy * elapsed / (SECONDS_PER_YEAR * PRECISION)
        const numerator = SafeMath.mul(SafeMath.mul(staked, apy), elapsed);
        const denominator = SafeMath.mul(SECONDS_PER_YEAR, PRECISION);

        return SafeMath.div(numerator, denominator);
    }

    // --- Public methods ---

    @method(
        { name: 'for', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 }
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('Staked')
    public stake(calldata: Calldata): BytesWriter {
        this._requireNotPaused();

        const forAddress: Address = calldata.readAddress();
        const amount: u256 = calldata.readU256();

        if (u256.eq(amount, u256.Zero)) {
            throw new Revert(ERR_ZERO_AMOUNT);
        }

        if (forAddress.empty()) {
            throw new Revert(ERR_ZERO_ADDRESS);
        }

        // Accumulate unclaimed rewards before modifying stake
        const pending = this._calculatePendingRewards(forAddress);
        if (u256.gt(pending, u256.Zero)) {
            const unclaimedEntry = this._unclaimedRewards.get(forAddress);
            unclaimedEntry.set(SafeMath.add(unclaimedEntry.get(), pending));
        }

        // Update staked balance
        const stakedEntry = this._stakedBalances.get(forAddress);
        stakedEntry.set(SafeMath.add(stakedEntry.get(), amount));

        // Update total staked
        this._totalStaked.set(SafeMath.add(this._totalStaked.get(), amount));

        // Reset staking timestamp to now
        const tsEntry = this._stakingTimestamp.get(forAddress);
        tsEntry.set(u256.fromU64(Blockchain.block.timestamp));

        // Emit event
        const eventWriter = new BytesWriter(64);
        eventWriter.writeAddress(forAddress);
        eventWriter.writeU256(amount);
        this.emitEvent('Staked', eventWriter.getBuffer());

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method(
        { name: 'for', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 }
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('Unstaked')
    public unstake(calldata: Calldata): BytesWriter {
        this._requireNotPaused();

        const forAddress: Address = calldata.readAddress();
        const amount: u256 = calldata.readU256();

        if (u256.eq(amount, u256.Zero)) {
            throw new Revert(ERR_ZERO_AMOUNT);
        }

        const stakedEntry = this._stakedBalances.get(forAddress);
        const currentStake = stakedEntry.get();

        if (u256.lt(currentStake, amount)) {
            throw new Revert(ERR_INSUFFICIENT_STAKE);
        }

        // Accumulate unclaimed rewards before modifying stake
        const pending = this._calculatePendingRewards(forAddress);
        if (u256.gt(pending, u256.Zero)) {
            const unclaimedEntry = this._unclaimedRewards.get(forAddress);
            unclaimedEntry.set(SafeMath.add(unclaimedEntry.get(), pending));
        }

        // Update stake
        stakedEntry.set(SafeMath.sub(currentStake, amount));
        this._totalStaked.set(SafeMath.sub(this._totalStaked.get(), amount));

        // Reset timestamp
        const tsEntry = this._stakingTimestamp.get(forAddress);
        tsEntry.set(u256.fromU64(Blockchain.block.timestamp));

        // Emit event
        const eventWriter = new BytesWriter(64);
        eventWriter.writeAddress(forAddress);
        eventWriter.writeU256(amount);
        this.emitEvent('Unstaked', eventWriter.getBuffer());

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'for', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'claimed', type: ABIDataTypes.UINT256 })
    @emit('RewardsClaimed')
    public claimRewards(calldata: Calldata): BytesWriter {
        this._requireNotPaused();

        const forAddress: Address = calldata.readAddress();

        const pending = this._calculatePendingRewards(forAddress);
        const unclaimedEntry = this._unclaimedRewards.get(forAddress);
        const totalRewards = SafeMath.add(pending, unclaimedEntry.get());

        if (u256.gt(totalRewards, u256.Zero)) {
            // Clear unclaimed
            unclaimedEntry.set(u256.Zero);

            // Reset timestamp
            const tsEntry = this._stakingTimestamp.get(forAddress);
            tsEntry.set(u256.fromU64(Blockchain.block.timestamp));

            // Track total distributed
            this._totalRewardsDistributed.set(
                SafeMath.add(this._totalRewardsDistributed.get(), totalRewards)
            );

            // Emit event
            const eventWriter = new BytesWriter(64);
            eventWriter.writeAddress(forAddress);
            eventWriter.writeU256(totalRewards);
            this.emitEvent('RewardsClaimed', eventWriter.getBuffer());
        }

        const writer = new BytesWriter(32);
        writer.writeU256(totalRewards);
        return writer;
    }

    @method({ name: 'user', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'rewards', type: ABIDataTypes.UINT256 })
    public pendingRewards(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();

        const pending = this._calculatePendingRewards(user);
        const unclaimedEntry = this._unclaimedRewards.get(user);
        const total = SafeMath.add(pending, unclaimedEntry.get());

        const writer = new BytesWriter(32);
        writer.writeU256(total);
        return writer;
    }

    @method({ name: 'user', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'balance', type: ABIDataTypes.UINT256 })
    public stakedBalance(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();
        const stakedEntry = this._stakedBalances.get(user);

        const writer = new BytesWriter(32);
        writer.writeU256(stakedEntry.get());
        return writer;
    }

    @method()
    @returns({ name: 'total', type: ABIDataTypes.UINT256 })
    public getTotalStaked(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeU256(this._totalStaked.get());
        return writer;
    }

    @method()
    @returns({ name: 'apy', type: ABIDataTypes.UINT256 })
    public getApy(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeU256(this._apy.get());
        return writer;
    }

    @method()
    @returns({ name: 'token', type: ABIDataTypes.ADDRESS })
    public getTokenAddress(_calldata: Calldata): BytesWriter {
        const tokenStorage = this._getTokenAddressStorage();
        const writer = new BytesWriter(32);
        writer.writeU256(tokenStorage.get());
        return writer;
    }

    @method()
    @returns({ name: 'ownerAddress', type: ABIDataTypes.ADDRESS })
    public getOwner(_calldata: Calldata): BytesWriter {
        const ownerStorage: StoredU256 = new StoredU256(this.ownerPointer, u256.Zero);
        const writer = new BytesWriter(32);
        writer.writeU256(ownerStorage.get());
        return writer;
    }

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public pause(_calldata: Calldata): BytesWriter {
        this._requireOwner();
        this._paused.set(true);

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public unpause(_calldata: Calldata): BytesWriter {
        this._requireOwner();
        this._paused.set(false);

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'newApy', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setApy(calldata: Calldata): BytesWriter {
        this._requireOwner();
        const newApy: u256 = calldata.readU256();
        this._apy.set(newApy);

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }
}
