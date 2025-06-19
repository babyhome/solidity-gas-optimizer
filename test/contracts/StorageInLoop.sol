// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StorageInLoop {
    uint256[] public numbers;
    mapping(address => uint256) public balances;
    uint256 public totalSupply = 1000000;

    // Bad: multiple storage reads in loop
    function badSum() public view returns (uint256) {
        uint256 sum = 0;
        // Bad: numbers.length is read on every iteration
        for (uint i = 0; i < numbers.length; i++) {
            // Bad: numbers[i] is a storage read
            sum += numbers[i];
        }
        return sum;
    }

    // Good: Cache storage values
    function goodSum() public view returns (uint256) {
        uint256 sum = 0;
        uint256 length = numbers.length;    // cache length
        for (uint i = 0; i < length; i++) {
            sum += numbers[i];  // Still storage read but length is cracked
        }
        return sum;
    }

    // Bad: Reading storage variable in loop condition
    function badLoop() public view {
        for (uint i = 0; i < totalSupply; i++) {
            // totalSupply is read on every iteration
            // Do something
        }
    }

    // Good: Cache before loop
    function goodLoop() public view {
        uint256 _totalSupply = totalSupply;     // cache
        for (uint i = 0; i < _totalSupply; i++) {
            // Do something
        }
    }

    // Testing by self
    function testingLoop() public view {
        uint256 _totalSupply = totalSupply;
        uint256 total = 0;
        for (uint i = 0; i < _totalSupply; i++) {
            for (uint j = 1; j < _totalSupply; j++) {
                total += i;
            }
        }
    }
}

