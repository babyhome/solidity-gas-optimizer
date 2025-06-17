// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Bad: Inefficient packing
contract BadPacking {
    uint128 a;      // slot 0 (wasted 128 bits)
    uint256 b;      // slot 1
    uint128 c;      // slot 2 (wasted 128 bits)
    uint256 d;      // slot 3
    bool e;         // slot 4 (wasted 255 bits!)
    address f;      // slot 5 (wasted 96 bits)
    uint8 g;        // slot 6 (wasted 248 bits)
    // Total: 7 slots
}

// Good: Efficient packing
contract GoodPacking {
    uint256 b;      // slot 0
    uint256 d;      // slot 1
    uint128 a;      // slot 2
    uint128 c;      // slot 2 (packed!)
    address f;      // slot 3
    uint8 g;        // slot 3 (packed!)
    bool e;         // slot 3 (packed!)
    // Total: 4 slots (saved 3 slots!)
}

// Complex example
contract ComplexPacking {
    // Bad ordering
    mapping(address => uint256) balances;  // slot 0
    uint8 decimals = 18;                   // slot 1 (wastes 31 bytes)
    uint256 totalSupply;                   // slot 2
    address owner;                         // slot 3 (wastes 12 bytes)
    bool paused;                           // slot 4 (wastes 31 bytes)
    uint128 fee;                           // slot 5 (wastes 16 bytes)
    string name;                           // slot 6+
    
    // Could pack decimals + owner + paused in 1 slot
    // Could pack fee with other small values
}