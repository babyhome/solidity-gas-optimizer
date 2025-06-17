// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Bad: Using string errors
contract BadErrors {
    mapping(address => uint256) balances;
    address owner;
    
    function withdraw(uint256 amount) public {
        // High cost: Long string
        require(balances[msg.sender] >= amount, "Insufficient balance for withdrawal");
        
        // Medium cost: Medium string
        require(amount > 0, "Amount must be greater than zero");
        
        // Repeated error
        require(msg.sender != address(0), "Invalid address");
    }
    
    function transfer(address to, uint256 amount) public {
        require(to != address(0), "Invalid address"); // Same error!
        require(balances[msg.sender] >= amount, "Insufficient balance for withdrawal"); // Same!
        
        if (msg.sender != owner) {
            revert("Only owner can call this function");
        }
    }
}

// Good: Using custom errors
contract GoodErrors {
    error InsufficientBalance(uint256 requested, uint256 available);
    error InvalidAmount();
    error InvalidAddress(address account);
    error OnlyOwner(address caller);
    
    mapping(address => uint256) balances;
    address owner;
    
    function withdraw(uint256 amount) public {
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(amount, balances[msg.sender]);
        }
        
        if (amount == 0) revert InvalidAmount();
        
        if (msg.sender == address(0)) {
            revert InvalidAddress(msg.sender);
        }
    }
    
    function transfer(address to, uint256 amount) public {
        if (to == address(0)) revert InvalidAddress(to);
        
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(amount, balances[msg.sender]);
        }
        
        if (msg.sender != owner) revert OnlyOwner(msg.sender);
    }
}