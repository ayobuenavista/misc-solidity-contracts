const TestToken = artifacts.require('Token.sol');
const DistributeRewards = artifacts.require('DistributeRewards');
const {constants, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {assert} = require('chai');
const BN = web3.utils.BN;

require('chai').use(require('chai-as-promised')).use(require('chai-bn')(BN)).should();

const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const numTokens = 3;
const tokens = [];
const tokenDecimals = [];

let admin;
let operator;

contract('DistributeRewards', function (accounts) {
  before('init tokens and contract', async () => {
    admin = accounts[0];
    operator = accounts[1];

    //init tokens
    for (let i = 0; i < numTokens; i++) {
      tokenDecimals[i] = new BN(15).add(new BN(i));
      token = await TestToken.new(`test${i}`, `test${i}`, tokenDecimals[i]);
      tokens[i] = token;
    }
  });

  beforeEach('create new rewards distribution contract', async () => {
    dist = await DistributeRewards.new(admin);
    await dist.addOperator(operator);
  });

  it('should receive ETH', async () => {
    const amount = new BN(web3.utils.toWei('10'));
    await dist.sendTransaction({value: amount});
    const balance = new BN(await web3.eth.getBalance(dist.address));
    assert(
      amount.should.be.a.bignumber.that.equals(balance),
      'initial sent ETH amount != contract ETH balance'
    );
  });

  it('should receive tokens', async () => {
    const amounts = [];
    let amount;
    let balance;

    for (let i = 0; i < tokens.length; i++) {
      amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[i]));
      amounts.push(amount);
      await tokens[i].transfer(dist.address, amount);

      balance = new BN(await tokens[i].balanceOf(dist.address));
      assert(
        amounts[i].should.be.a.bignumber.that.equals(balance),
        'initial sent token amount != contract token balance'
      );
    }
  });

  it('should distribute ETH rewards to a single winner', async () => {
    const winner = accounts[3];
    const initBalance = new BN(await web3.eth.getBalance(winner));
    const amount = new BN(web3.utils.toWei('1'));

    await dist.sendTransaction({value: amount});
    await dist.distribute(winner, ethAddress, amount, {from: operator});

    const expectedBalance = initBalance.add(amount);
    const finalBalance = new BN(await web3.eth.getBalance(winner));

    assert(
      finalBalance.should.be.a.bignumber.that.equals(expectedBalance),
      'winner did not receive ETH rewards'
    );
  });

  it('should distribute token rewards to a single winner', async () => {
    const winner = accounts[3];

    let amount;
    let initBalance;
    let expectedBalance;
    let finalBalance;

    for (let i = 0; i < tokens.length; i++) {
      initBalance = new BN(await tokens[i].balanceOf(winner));

      amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[i]));
      await tokens[i].transfer(dist.address, amount);
      await dist.distribute(winner, tokens[i].address, amount, {from: operator});

      expectedBalance = initBalance.add(amount);
      finalBalance = new BN(await tokens[i].balanceOf(winner));

      assert(
        finalBalance.should.be.a.bignumber.that.equals(expectedBalance),
        'winner did not receive token rewards'
      );
    }
  });

  it('should distribute ETH rewards to multiple winners', async () => {
    const winners = [];
    const initBalances = [];
    let initBalance;
    let expectedBalance;
    let finalBalance;
    let amount;

    amount = new BN(web3.utils.toWei('50')); // send excess ETH to contract
    await dist.sendTransaction({value: amount});

    for (let i = 3; i < 20; i++) {
      winners.push(accounts[i]);
      initBalances.push(new BN(await web3.eth.getBalance(accounts[i])));
    }

    amount = new BN(web3.utils.toWei('1')); // amount to distribute
    await dist.distributeToMany(winners, ethAddress, amount, {from: operator});

    for (let i = 0; i < winners.length; i++) {
      initBalance = new BN(initBalances[i]);
      expectedBalance = initBalance.add(amount);
      finalBalance = new BN(await web3.eth.getBalance(winners[i]));

      assert(
        finalBalance.should.be.a.bignumber.that.equals(expectedBalance),
        'winners did not receive ETH rewards'
      );
    }
  });

  it('should distribute token rewards to multiple winners', async () => {
    let winners;
    let initBalances;
    let initBalance;
    let expectedBalance;
    let finalBalance;
    let amount;

    for (let i = 0; i < tokens.length; i++) {
      amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[i])); // send excess tokens to contract
      await tokens[i].transfer(dist.address, amount);

      winners = [];
      initBalances = [];
      for (let j = 3; j < 20; j++) {
        winners.push(accounts[j]);
        initBalances.push(new BN(await tokens[i].balanceOf(accounts[j])));
      }

      amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[i])); // amount to distribute
      await dist.distributeToMany(winners, tokens[i].address, amount, {from: operator});

      for (let j = 0; j < winners.length; j++) {
        initBalance = new BN(initBalances[j]);
        expectedBalance = initBalance.add(amount);
        finalBalance = new BN(await tokens[i].balanceOf(winners[j]));

        assert(
          finalBalance.should.be.a.bignumber.that.equals(expectedBalance),
          'winners did not receive token rewards'
        );
      }
    }
  });

  it('should allow the admin to withdraw ETH', async () => {
    const amount = new BN(web3.utils.toWei('1'));
    await dist.sendTransaction({value: amount});

    const initBalance = new BN(await web3.eth.getBalance(admin));
    await dist.withdrawEther(amount, admin);
    const finalBalance = new BN(await web3.eth.getBalance(admin));

    assert(
      finalBalance.should.be.a.bignumber.that.is.greaterThan(initBalance),
      'admin was unable to withdraw ETH back'
    );

    const distBalance = new BN(await web3.eth.getBalance(dist.address));

    assert(
      distBalance.should.be.a.bignumber.that.equals(new BN(0)),
      'contract ETH balance should be 0'
    );
  });

  it('should allow the admin to withdraw tokens', async () => {
    let amount;
    let initBalance;
    let finalBalance;
    let distBalance;

    for (let i = 0; i < tokens.length; i++) {
      amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[i]));
      await tokens[i].transfer(dist.address, amount);

      initBalance = new BN(await tokens[i].balanceOf(admin));
      await dist.withdrawToken(tokens[i].address, amount, admin);
      finalBalance = new BN(await tokens[i].balanceOf(admin));

      assert(
        finalBalance.should.be.a.bignumber.that.is.greaterThan(initBalance),
        'admin was unable to withdraw tokens back'
      );

      distBalance = new BN(await tokens[i].balanceOf(dist.address));

      assert(
        distBalance.should.be.a.bignumber.that.equals(new BN(0)),
        'contract token balance should be 0'
      );
    }
  });

  it('should revert if adding operator is not done by admin', async () => {
    await expectRevert(dist.addOperator(operator, {from: accounts[3]}), 'Only admin');
  });

  it('should revert if single distribution is not done by operator', async () => {
    const winner = accounts[3];
    let amount = new BN(web3.utils.toWei('1'));
    await dist.sendTransaction({value: amount});

    await expectRevert(dist.distribute(winner, ethAddress, amount), 'Only operator');

    amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);

    await expectRevert(dist.distribute(winner, tokens[0].address, amount), 'Only operator');
  });

  it('should revert if multiple distribution is not done by operator', async () => {
    const winners = [];

    for (let i = 3; i < 20; i++) {
      winners.push(accounts[i]);
    }

    let amount = new BN(web3.utils.toWei('50'));
    await dist.sendTransaction({value: amount});

    amount = new BN(web3.utils.toWei('1'));
    await expectRevert(dist.distributeToMany(winners, ethAddress, amount), 'Only operator');

    amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);
    amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));

    await expectRevert(dist.distributeToMany(winners, tokens[0].address, amount), 'Only operator');
  });

  it('should revert if winner is zero address for single distribution', async () => {
    let amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);
    amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));

    await expectRevert(
      dist.distribute(constants.ZERO_ADDRESS, tokens[0].address, amount, {from: operator}),
      'winner cannot be zero address'
    );
  });

  it('should revert if winner is zero address for multiple distribution', async () => {
    const winners = [];

    for (let i = 3; i < 20; i++) {
      winners.push(constants.ZERO_ADDRESS);
    }

    let amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);
    amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));

    await expectRevert(
      dist.distributeToMany(winners, tokens[0].address, amount, {from: operator}),
      'winner cannot be zero address'
    );
  });

  it('should revert if token is zero address for single distribution', async () => {
    const winner = accounts[3];

    let amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);
    amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));

    await expectRevert(
      dist.distribute(winner, constants.ZERO_ADDRESS, amount, {from: operator}),
      'token cannot be zero address'
    );
  });

  it('should revert if token is zero address for multiple distribution', async () => {
    const winners = [];

    for (let i = 3; i < 20; i++) {
      winners.push(accounts[i]);
    }

    let amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);
    amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));

    await expectRevert(
      dist.distributeToMany(winners, constants.ZERO_ADDRESS, amount, {from: operator}),
      'token cannot be zero address'
    );
  });

  it('should revert if amount is quantity for single distribution', async () => {
    const winner = accounts[3];

    let amount = new BN(web3.utils.toWei('1'));
    await dist.sendTransaction({value: amount});

    amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);

    amount = new BN(0);
    await expectRevert(
      dist.distribute(winner, ethAddress, amount, {from: operator}),
      'amount is 0'
    );
    await expectRevert(
      dist.distribute(winner, tokens[0].address, amount, {from: operator}),
      'amount is 0'
    );
  });

  it('should revert if amount is zero quantity for multiple distribution', async () => {
    const winners = [];

    for (let i = 3; i < 20; i++) {
      winners.push(accounts[i]);
    }

    let amount = new BN(web3.utils.toWei('1'));
    await dist.sendTransaction({value: amount});

    amount = new BN(50000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);

    amount = new BN(0);
    await expectRevert(
      dist.distributeToMany(winners, ethAddress, amount, {from: operator}),
      'amount is 0'
    );
    await expectRevert(
      dist.distributeToMany(winners, tokens[0].address, amount, {from: operator}),
      'amount is 0'
    );
  });

  it('should revert if the ETH balance is not enough for distribution to a single user', async () => {
    const winner = accounts[3];

    let amount = new BN(web3.utils.toWei('1'));
    await dist.sendTransaction({value: amount});

    amount = new BN(web3.utils.toWei('1.1'));
    await expectRevert(
      dist.distribute(winner, ethAddress, amount, {from: operator}),
      'eth amount required > balance'
    );
  });

  it('should revert if the token balance is not enough for distribution to a single user', async () => {
    const winner = accounts[3];

    let amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);

    amount = new BN(1500).mul(new BN(10).pow(tokenDecimals[0]));
    await expectRevert(
      dist.distribute(winner, tokens[0].address, amount, {from: operator}),
      'token amount required > balance'
    );
  });

  it('should revert if ETH withdrawal is not done by admin', async () => {
    const account = accounts[10];
    const amount = new BN(web3.utils.toWei('1'));
    await dist.sendTransaction({value: amount});

    await expectRevert(dist.withdrawEther(amount, admin, {from: account}), 'Only admin');
  });

  it('should revert if token withdrawal is not done by admin', async () => {
    const account = accounts[10];
    const amount = new BN(1000).mul(new BN(10).pow(tokenDecimals[0]));
    await tokens[0].transfer(dist.address, amount);

    await expectRevert(
      dist.withdrawToken(tokens[0].address, amount, admin, {from: account}),
      'Only admin'
    );
  });
});
