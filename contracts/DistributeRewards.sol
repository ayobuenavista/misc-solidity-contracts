pragma solidity 0.6.6;

import "./utils/IERC20.sol";
import "./utils/SafeERC20.sol";
import "./utils/Withdrawable.sol";


interface GasToken {
    function freeFromUpTo(address from, uint256 value) external returns (uint256);
}

contract DistributeRewards is Withdrawable {
    using SafeERC20 for IERC20;

    modifier discountGasToken(GasToken gasToken) {
        uint256 gasStart = gasleft();
        _;
        uint256 gasSpent = 21000 + gasStart - gasleft() + 16 * msg.data.length;
        gasToken.freeFromUpTo(address(this), (gasSpent + 14154) / 41947);
    }

    constructor(address _admin) public Withdrawable(_admin) {}

    IERC20 internal constant ETH_TOKEN_ADDRESS = IERC20(
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    );

    receive() external payable {}

    function distributeSingle(
        address payable winner,
        IERC20 token,
        uint256 amount,
        GasToken gasToken
    ) public onlyOperator {
        require(winner != address(0), "winner cannot be zero address");
        require(address(token) != address(0), "token cannot be zero address");
        require(amount > 0, "amount is 0");

        if (address(gasToken) == address(0)) {
            _distributeWithoutGasToken(winner, token, amount);
        } else {
            _distributeWithGasToken(winner, token, amount, gasToken);
        }
    }

    function distributeMany(
        address[] memory winners,
        IERC20 token,
        uint256 amount,
        GasToken gasToken
    ) public onlyOperator {
        for (uint256 i = 0; i < winners.length; i++) {
            distributeSingle(payable(winners[i]), token, amount, gasToken);
        }
    }

    function _distributeWithGasToken(
        address payable winner,
        IERC20 token,
        uint256 amount,
        GasToken gasToken
    ) private discountGasToken(gasToken) {
        _distribute(winner, token, amount);
    }

    function _distributeWithoutGasToken(
        address payable winner,
        IERC20 token,
        uint256 amount
    ) private {
        _distribute(winner, token, amount);
    }

    function _distribute(
        address payable winner,
        IERC20 token,
        uint256 amount
    ) private {
        if (token == ETH_TOKEN_ADDRESS) {
            require(address(this).balance >= amount, "eth amount required > balance");
            (bool success, ) = winner.call{value: amount}("");
            require(success, "send to winner failed");
        } else {
            require(token.balanceOf(address(this)) >= amount, "token amount required > balance");
            token.safeTransfer(winner, amount);
        }
    }
}
