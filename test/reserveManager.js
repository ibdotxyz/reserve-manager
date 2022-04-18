const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe('ReserveManager', () => {
  const toWei = ethers.utils.parseEther;
  const provider = waffle.provider;

  let accounts;
  let root, rootAddress;
  let owner, ownerAddress;
  let manualBurner, manualBurnerAddress;
  let user, userAddress;

  let burner;
  let newBurner;
  let comptroller;
  let reserveManager;
  let underlying;
  let cTokenAdmin;
  let cToken;
  let cOther;
  let cEth;
  let weth;
  let usdc;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    root = accounts[0];
    rootAddress = await root.getAddress();
    owner = accounts[1];
    ownerAddress = await owner.getAddress();
    manualBurner = accounts[2];
    manualBurnerAddress = await manualBurner.getAddress();
    user = accounts[3];
    userAddress = await user.getAddress();

    const burnerFactory = await ethers.getContractFactory("MockBurner");
    const comptrollerFactory = await ethers.getContractFactory("MockComptroller");
    const reserveManagerFactory = await ethers.getContractFactory("MockReserveManager");
    const tokenFactory = await ethers.getContractFactory("MockToken");
    const cTokenAdminFactory = await ethers.getContractFactory("MockCTokenAdmin");
    const cTokenFactory = await ethers.getContractFactory("MockCToken");
    const cEthFactory = await ethers.getContractFactory("MockCEth");
    const wEthFactory = await ethers.getContractFactory("WETH");

    burner = await burnerFactory.deploy();
    newBurner = await burnerFactory.deploy();
    comptroller = await comptrollerFactory.deploy();
    weth = await wEthFactory.deploy();
    usdc = await tokenFactory.deploy();
    reserveManager = await reserveManagerFactory.deploy(ownerAddress, manualBurnerAddress, comptroller.address, weth.address, usdc.address);
    underlying = await tokenFactory.deploy();
    cTokenAdmin = await cTokenAdminFactory.deploy();
    cToken = await cTokenFactory.deploy(cTokenAdmin.address, underlying.address);
    cOther = await cTokenFactory.deploy(cTokenAdmin.address, underlying.address);
    cEth = await cEthFactory.deploy(cTokenAdmin.address);
  });

  describe('setBurners', async () => {
    it('sets burner successfully', async () => {
      await reserveManager.connect(owner).setBurners([cToken.address, cEth.address], [burner.address, burner.address]);
      expect(await reserveManager.burners(cToken.address)).to.eq(burner.address);
      expect(await reserveManager.burners(cEth.address)).to.eq(burner.address);
    });

    it('failed to set burner for non-owner', async () => {
      await expect(reserveManager.setBurners([cToken.address, cEth.address], [burner.address, burner.address])).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('failed to set burner for invalid data', async () => {
      await expect(reserveManager.connect(owner).setBurners([cToken.address], [burner.address, burner.address])).to.be.revertedWith('invalid data');
    });
  });

  describe('adjustRatio', async () => {
    const newRatio = toWei('0.6');

    it('adjusts ratio successfully', async () => {
      expect(await reserveManager.ratio()).to.eq(toWei('0.5'));
      await reserveManager.connect(owner).adjustRatio(newRatio);
      expect(await reserveManager.ratio()).to.eq(newRatio);
    });

    it('failed to adjust ratio for non-owner', async () => {
      await expect(reserveManager.adjustRatio(newRatio)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('failed to adjust ratio for invalid ratio', async () => {
      const invalidRatio = toWei('1.1');
      await expect(reserveManager.connect(owner).adjustRatio(invalidRatio)).to.be.revertedWith('invalid ratio');
    });
  });

  describe('seize', async () => {
    const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

    beforeEach(async () => {
      await Promise.all([
        usdc.mint(reserveManager.address, 1e6),
        root.sendTransaction({to: reserveManager.address, value: toWei('1')})
      ]);
    });

    it('seizes tokens', async () => {
      await reserveManager.connect(owner).seize(usdc.address, 1e6);
      expect(await usdc.balanceOf(ownerAddress)).to.eq(1e6);
      expect(await usdc.balanceOf(reserveManager.address)).to.eq(0);
    });

    it('seizes ethers', async () => {
      const ethBalance1 = await provider.getBalance(ownerAddress);
      const tx = await reserveManager.connect(owner).seize(ethAddress, toWei('1'));
      const result = await tx.wait();
      const gas = result.gasUsed.mul(tx.gasPrice);
      const ethBalance2 = await provider.getBalance(ownerAddress);
      expect(ethBalance2.sub(ethBalance1).add(gas)).to.eq(toWei('1'));
      expect(await provider.getBalance(reserveManager.address)).to.eq(0);
    });

    it('failed to seize for non-owner', async () => {
      await expect(reserveManager.seize(ethAddress, toWei('1'))).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('setBlocked', async () => {
    it('sets block successfully', async () => {
      await reserveManager.connect(owner).setBlocked([cToken.address], [true]);
      expect(await reserveManager.isBlocked(cToken.address)).to.eq(true);

      await reserveManager.connect(owner).setBlocked([cToken.address], [false]);
      expect(await reserveManager.isBlocked(cToken.address)).to.eq(false);
    });

    it('failed to set block for non-owner', async () => {
      await expect(reserveManager.setBlocked([cToken.address], [true])).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('failed to set block for invalid data', async () => {
      await expect(reserveManager.connect(owner).setBlocked([cToken.address], [true, true])).to.be.revertedWith('invalid data');
    });
  });

  describe('setManualBurn', async () => {
    it('sets manual burn successfully', async () => {
      await reserveManager.connect(owner).setManualBurn([cToken.address, cEth.address], [true, true]);
      expect(await reserveManager.manualBurn(cToken.address)).to.eq(true);
      expect(await reserveManager.manualBurn(cEth.address)).to.eq(true);
    });

    it('failed to set manual burn for non-owner', async () => {
      await expect(reserveManager.setManualBurn([cToken.address, cEth.address], [true, true])).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('failed to set manual burn for invalid data', async () => {
      await expect(reserveManager.connect(owner).setManualBurn([cToken.address], [true, true])).to.be.revertedWith('invalid data');
    });
  });

  describe('setManualBurner', async () => {
    it('sets manual burner successfully', async () => {
      await reserveManager.connect(owner).setManualBurner(userAddress);
      expect(await reserveManager.manualBurner()).to.eq(userAddress);
    });

    it('failed to set manual burner for non-owner', async () => {
      await expect(reserveManager.setManualBurner(userAddress)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('failed to set manual burner for invalid new manual burner', async () => {
      await expect(reserveManager.connect(owner).setManualBurner(ethers.constants.AddressZero)).to.be.revertedWith('invalid new manual burner');
    });
  });

  describe('setNativeMarket', async () => {
    it('sets native market successfully', async () => {
      await reserveManager.connect(owner).setNativeMarket(cEth.address, true);
      expect(await reserveManager.isNativeMarket(cEth.address)).to.eq(true);
    });

    it('failed to set native market for non-owner', async () => {
      await expect(reserveManager.setNativeMarket(cEth.address, true)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('dispatchMultiple', async () => {
    const initTimestamp = 10000;
    const initReserves = toWei('1');

    beforeEach(async () => {
      await Promise.all([
        comptroller.setmarketListed(cToken.address, true),
        comptroller.setmarketListed(cEth.address, true),
        cToken.setTotalReserves(initReserves),
        cEth.setTotalReserves(initReserves),
        reserveManager.connect(owner).setBurners([cToken.address, cEth.address], [burner.address, burner.address]),
        reserveManager.setBlockTimestamp(initTimestamp),
        reserveManager.connect(owner).setNativeMarket(cEth.address, true),
        root.sendTransaction({
          to: cTokenAdmin.address,
          value: toWei('100'),
        })
      ]);
    });

    it('dispatches successfully', async () => {
      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cToken.address, cEth.address]);
      const cTokenSnapshot1 = await reserveManager.reservesSnapshot(cToken.address);
      const cEthSnapshot1 = await reserveManager.reservesSnapshot(cEth.address);
      expect(cTokenSnapshot1.timestamp).to.eq(initTimestamp);
      expect(cTokenSnapshot1.totalReserves).to.eq(initReserves);
      expect(cEthSnapshot1.timestamp).to.eq(initTimestamp);
      expect(cEthSnapshot1.totalReserves).to.eq(initReserves);
      expect(await underlying.balanceOf(burner.address)).to.eq(0);
      expect(await provider.getBalance(burner.address)).to.eq(0);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      const reserves = toWei('2'); // 1 -> 2
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cToken.setTotalReserves(reserves),
        cEth.setTotalReserves(reserves)
      ]);

      // Dispatch!
      await reserveManager.dispatchMultiple([cToken.address, cEth.address]);
      const cTokenSnapshot2 = await reserveManager.reservesSnapshot(cToken.address);
      const cEthSnapshot2 = await reserveManager.reservesSnapshot(cEth.address);
      const cTokenReserves = await cToken.totalReserves();
      const cEthReserves = await cEth.totalReserves();
      expect(cTokenReserves).to.eq(toWei('1.5')); // 1 + (2 - 1) * 0.5
      expect(cEthReserves).to.eq(toWei('1.5')); // 1 + (2 - 1) * 0.5
      expect(cTokenSnapshot2.timestamp).to.eq(timestamp);
      expect(cTokenSnapshot2.totalReserves).to.eq(cTokenReserves);
      expect(cEthSnapshot2.timestamp).to.eq(timestamp);
      expect(cEthSnapshot2.totalReserves).to.eq(cEthReserves);
      expect(await underlying.balanceOf(burner.address)).to.eq(toWei('0.5'));
      expect(await weth.balanceOf(burner.address)).to.eq(toWei('0.5'));

      const timestamp2 = 200000; // 1 day later, 200000 > 100000 + 86400
      const reserves2 = toWei('2.5'); // 1.5 -> 2.5
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp2),
        cToken.setTotalReserves(reserves2),
        cEth.setTotalReserves(reserves2)
      ]);

      // Dispatch again!
      await reserveManager.dispatchMultiple([cToken.address, cEth.address]);
      const cTokenSnapshot3 = await reserveManager.reservesSnapshot(cToken.address);
      const cEthSnapshot3 = await reserveManager.reservesSnapshot(cEth.address);
      const cTokenReserves2 = await cToken.totalReserves();
      const cEthReserves2 = await cEth.totalReserves();
      expect(cTokenReserves2).to.eq(toWei('2')); // 1.5 + (2.5 - 1.5) * 0.5
      expect(cEthReserves2).to.eq(toWei('2')); // 1.5 + (2.5 - 1.5) * 0.5
      expect(cTokenSnapshot3.timestamp).to.eq(timestamp2);
      expect(cTokenSnapshot3.totalReserves).to.eq(cTokenReserves2);
      expect(cEthSnapshot3.timestamp).to.eq(timestamp2);
      expect(cEthSnapshot3.totalReserves).to.eq(cEthReserves2);
      expect(await underlying.balanceOf(burner.address)).to.eq(toWei('1'));
      expect(await weth.balanceOf(burner.address)).to.eq(toWei('1'));
    });

    it('resets the snapshot successfully', async () => {
      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cToken.address]);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      const reserves = toWei('2'); // 1 -> 2
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cToken.setTotalReserves(reserves)
      ]);

      // Dispatch!
      await reserveManager.dispatchMultiple([cToken.address]);

      // Simulate that we reduce some reserves. No need to wait for cool down.
      const timestamp2 = 100001; // only 1 second later
      const reserves2 = toWei('1'); // 1.5 -> 1
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp2),
        cToken.setTotalReserves(reserves2)
      ]);

      // Update the reserves snapshot.
      await reserveManager.dispatchMultiple([cToken.address]);
      const cTokenSnapshot1 = await reserveManager.reservesSnapshot(cToken.address);
      expect(cTokenSnapshot1.timestamp).to.eq(timestamp2);
      expect(cTokenSnapshot1.totalReserves).to.eq(reserves2);

      const timestamp3 = 200000; // 1 day later, 200000 > 100001 + 86400
      const reserves3 = toWei('2'); // 1 -> 2
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp3),
        cToken.setTotalReserves(reserves3)
      ]);

      // Dispatch again!
      await reserveManager.dispatchMultiple([cToken.address]);
      const cTokenSnapshot2 = await reserveManager.reservesSnapshot(cToken.address);
      const cTokenReserves = await cToken.totalReserves();
      expect(cTokenReserves).to.eq(toWei('1.5')); // 1 + (2 - 1) * 0.5
      expect(cTokenSnapshot2.timestamp).to.eq(timestamp3);
      expect(cTokenSnapshot2.totalReserves).to.eq(cTokenReserves);
    });

    it('burns more than reserves reduced amount', async () => {
      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cToken.address]);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      const reserves = toWei('2'); // 1 -> 2
      const ratio = toWei('0.6');
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cToken.setTotalReserves(reserves),
        reserveManager.connect(owner).adjustRatio(ratio),
        underlying.mint(reserveManager.address, toWei('1'))
      ]);

      // Dispatch!
      await reserveManager.dispatchMultiple([cToken.address]);
      const cTokenSnapshot = await reserveManager.reservesSnapshot(cToken.address);
      const cTokenReserves = await cToken.totalReserves();
      expect(cTokenReserves).to.eq(toWei('1.4')); // 1 + (2 - 1) * 0.4
      expect(cTokenSnapshot.timestamp).to.eq(timestamp);
      expect(cTokenSnapshot.totalReserves).to.eq(cTokenReserves);
      expect(await underlying.balanceOf(burner.address)).to.eq(toWei('1.6')); // 1 + 0.6
    });

    it('adjust ratio and dispatch successfully', async () => {
      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cToken.address]);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      const reserves = toWei('2'); // 1 -> 2
      const ratio = toWei('0.6');
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cToken.setTotalReserves(reserves),
        reserveManager.connect(owner).adjustRatio(ratio)
      ]);

      // Dispatch!
      await reserveManager.dispatchMultiple([cToken.address]);
      const cTokenSnapshot = await reserveManager.reservesSnapshot(cToken.address);
      const cTokenReserves = await cToken.totalReserves();
      expect(cTokenReserves).to.eq(toWei('1.4')); // 1 + (2 - 1) * 0.4
      expect(cTokenSnapshot.timestamp).to.eq(timestamp);
      expect(cTokenSnapshot.totalReserves).to.eq(cTokenReserves);
      expect(await underlying.balanceOf(burner.address)).to.eq(toWei('0.6'));
    });

    it('does nothing if there is no reserve to extract', async () => {
      await Promise.all([
        comptroller.setmarketListed(cOther.address, true),
        reserveManager.connect(owner).setBurners([cOther.address], [burner.address]),
        reserveManager.setBlockTimestamp(initTimestamp)
      ]);

      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cOther.address]);
      const cOtherSnapshot = await reserveManager.reservesSnapshot(cOther.address);
      const cOtherReserves = await cOther.totalReserves();
      expect(cOtherReserves).to.eq(0);
      expect(cOtherSnapshot.timestamp).to.eq(initTimestamp);
      expect(cOtherSnapshot.totalReserves).to.eq(0);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      await reserveManager.setBlockTimestamp(timestamp);

      // Nothing changed.
      await reserveManager.dispatchMultiple([cOther.address]);
      const cOtherSnapshot2 = await reserveManager.reservesSnapshot(cOther.address);
      const cOtherReserves2 = await cOther.totalReserves();
      expect(cOtherReserves2).to.eq(0);
      expect(cOtherSnapshot2.timestamp).to.eq(timestamp);
      expect(cOtherSnapshot2.totalReserves).to.eq(0);
      expect(await underlying.balanceOf(burner.address)).to.eq(0);
    });

    it('dispatches to the manual burner', async () => {
      await reserveManager.connect(owner).setManualBurn([cToken.address], [true]);

      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cToken.address]);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      const reserves = toWei('2'); // 1 -> 2
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cToken.setTotalReserves(reserves)
      ]);

      // Dispatch!
      await reserveManager.dispatchMultiple([cToken.address]);
      const cTokenSnapshot = await reserveManager.reservesSnapshot(cToken.address);
      const cTokenReserves = await cToken.totalReserves();
      expect(cTokenReserves).to.eq(toWei('1.5')); // 1 + (2 - 1) * 0.5
      expect(cTokenSnapshot.timestamp).to.eq(timestamp);
      expect(cTokenSnapshot.totalReserves).to.eq(cTokenReserves);
      expect(await underlying.balanceOf(manualBurnerAddress)).to.eq(toWei('0.5'));
    });

    it('failed to dispatch for market blocked from reserves sharing', async () => {
      await reserveManager.connect(owner).setBlocked([cOther.address], [true]);
      await expect(reserveManager.dispatchMultiple([cOther.address])).to.be.revertedWith('market is blocked from reserves sharing');
    });

    it('failed to dispatch for market not listed', async () => {
      await expect(reserveManager.dispatchMultiple([cOther.address])).to.be.revertedWith('market not listed');
    });

    it('failed to dispatch for burner not set', async () => {
      await Promise.all([
        comptroller.setmarketListed(cOther.address, true),
        cOther.setTotalReserves(initReserves),
        reserveManager.setBlockTimestamp(initTimestamp)
      ]);

      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cOther.address]);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      const reserves = toWei('2'); // 1 -> 2
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cOther.setTotalReserves(reserves)
      ]);
      await expect(reserveManager.dispatchMultiple([cOther.address])).to.be.revertedWith('burner not set');
    });

    it('failed to dispatch for in the cooldown period', async () => {
      await Promise.all([
        comptroller.setmarketListed(cOther.address, true),
        cOther.setTotalReserves(initReserves),
        reserveManager.connect(owner).setBurners([cOther.address], [burner.address]),
        reserveManager.setBlockTimestamp(initTimestamp)
      ]);

      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cOther.address]);

      const timestamp = 10001; // 1 second later
      const reserves = toWei('2'); // 1 -> 2
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cOther.setTotalReserves(reserves)
      ]);
      await expect(reserveManager.dispatchMultiple([cOther.address])).to.be.revertedWith('still in the cooldown period');
    });

    it('failed to dispatch for burner failure', async () => {
      await Promise.all([
        comptroller.setmarketListed(cOther.address, true),
        cOther.setTotalReserves(initReserves),
        reserveManager.connect(owner).setBurners([cOther.address], [burner.address]),
        reserveManager.setBlockTimestamp(initTimestamp),
        burner.setBurnFailed(true)
      ]);

      // Initialize the snapshot.
      await reserveManager.dispatchMultiple([cOther.address]);

      const timestamp = 100000; // 1 day later, 100000 > 10000 + 86400
      const reserves = toWei('2'); // 1 -> 2
      await Promise.all([
        reserveManager.setBlockTimestamp(timestamp),
        cOther.setTotalReserves(reserves)
      ]);
      await expect(reserveManager.dispatchMultiple([cOther.address])).to.be.revertedWith('Burner failed to burn the underlying token');
    });
  });
});
