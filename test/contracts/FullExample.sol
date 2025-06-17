// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FullExample {
    uint256[] public numbers;
    mapping(address => uint256) public balances;
    uint256 public totalSupply = 1000000;
    
    // Issue 1: Public function that should be external
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    // Issue 2: Storage reads in loop
    function calculateTotal() public view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < numbers.length; i++) {
            if (numbers[i] > totalSupply / 10) {
                total += numbers[i];
            }
        }
        return total;
    }
    
    // Issue 3: Multiple issues
    function complexFunction(address[] memory users) public view returns (uint256) {
        uint256 sum = 0;
        for (uint i = 0; i < users.length; i++) {
            // Good: users is memory array, not storage
            address user = users[i];
            
            // Bad: Reading from storage mapping in loop
            uint256 balance = balances[user];
            
            // Bad: Reading totalSupply in loop
            if (balance > totalSupply / 100) {
                sum += balance;
            }
        }
        return sum;
    }
}