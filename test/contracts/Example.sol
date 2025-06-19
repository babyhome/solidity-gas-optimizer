// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Example {
    uint256[] public values;
    uint256 public total;

    // Bad: Storage read in loop
    function sumValues() public {
        uint256 sum = 0;
        for (uint i = 0; i < values.length; i++) {
            sum += values[i];
        }
        total = sum;
    }

    // Bad: Should be external instead of public
    function getData() public view returns (uint256) {
        return total;
    }
}

