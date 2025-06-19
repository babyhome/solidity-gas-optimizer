// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract ComplexStoragePatterns {
    // State variables
    uint256[] public numbers;
    mapping(address => uint256) public balances;
    uint256 public constant MAX_SUPPLY = 1000000; // constant is OK
    uint256 public immutable deployTime; // immutable is OK
    uint256 public totalSupply = 1000000;

    struct User {
        string name;
        uint256 balance;
        bool active;
    }

    User[] public users;
    mapping(uint256 => User) public userMapping;

    constructor() {
        deployTime = block.timestamp;
    }

    // Pattern 1: Nested loops with storage reads
    function nestedLoopPattern() public view returns (uint256) {
        uint256 total = 0;
        
        // Bad: Reading users.length in outer loop
        for (uint i = 0; i < users.length; i++) {
            // Bad: Reading numbers.length in inner loop
            for (uint j = 0; j < numbers.length; j++) {
                total += numbers[j] * users[i].balance;
            }
        }
        
        return total;
    }

    // Pattern 2: Multiple storage reads of same variable
    function multipleReadsPattern() public view {
        // Bad: Reading totalSupply multiple times
        for (uint i = 0; i < 100; i++) {
            if (i < totalSupply / 2) {
                // Do something
            }
            if (i > totalSupply / 4) {
                // Do something else
            }
        }
    }

    // Pattern 3: Good pattern - properly cached
    function goodPattern() public view returns (uint256) {
        uint256 total = 0;
        uint256 usersLength = users.length; // Good: cached
        uint256 numbersLength = numbers.length; // Good: cached
        uint256 _totalSupply = totalSupply; // Good: cached
        
        for (uint i = 0; i < usersLength; i++) {
            User memory user = users[i]; // Good: cached struct
            for (uint j = 0; j < numbersLength; j++) {
                total += numbers[j] * user.balance;
            }
        }
        
        return total;
    }

    // Pattern 4: While loop with storage read
    function whileLoopPattern() public view {
        uint256 i = 0;
        // Bad: Reading totalSupply in while condition
        while (i < totalSupply) {
            // Do something
            i++;
        }
    }

    // Pattern 5: Do-while with storage read
    function doWhilePattern() public view {
        uint256 i = 0;
        do {
            // Do something
            i++;
        } while (i < numbers.length); // Bad: Reading array length
    }

    // Pattern 6: Complex condition with multiple storage reads
    function complexCondition() public view {
        // Bad: Multiple storage reads in loop condition
        for (uint i = 0; i < numbers.length && i < totalSupply; i++) {
            if (users[i].active && users[i].balance > 0) {
                // Do something
            }
        }
    }

    // Pattern 7: Function calls in loops (getters)
    function getterInLoop() public view {
        for (uint i = 0; i < 10; i++) {
            // These are actually storage reads!
            uint256 num = numbers[i];
            uint256 bal = balances[msg.sender];
        }
    }
}
