// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Bad: Inefficient packing
contract BadPacking {
    uint128 a;      // slot 0 (wasted 128 bits)
    uint256 b;      // slot 1
    uint128 c;      // slot 2 (wasted 128 bits)
    uint256 d;      // slot 3
    bool e;         // slot 4
    address f;      // slot 4 (packed!)
    uint8 g;        // slot 4 (packed!)
    // Total: 5 slots
}

// Good: Efficient packing
contract GoodPacking {
    uint256 b;      // slot 0: used 32/32 bytes
    uint256 d;      // slot 1: used 32/32 bytes  
    uint128 a;      // slot 2: used 16/32 bytes
    uint128 c;      // slot 2: used 16/32 bytes (packed!)
    address f;      // slot 3: used 20/32 bytes
    uint8 g;        // slot 3: used 1/32 bytes (packed!)
    bool e;         // slot 3: used 1/32 bytes (packed!)
    // Total: 4 slots (saved 3 slots!)
}

contract ExamplePacking {
    // จะถูกข้าม - ไม่ใช้ storage
    uint256 public constant RATE = 100;
    address public immutable factory;

    // จะถูกประมวลผล - ใช้ storage
    uint128 public balance;     // slot 0
    address public owner;       // slot 1  
    bool public paused;         // slot 2 (ไม่มีประสิทธิภาพ!)
}

// // Complex example
// contract ComplexPacking {
//     // Bad ordering
//     mapping(address => uint256) balances;  // slot 0
//     uint8 decimals = 18;                   // slot 1 (wastes 31 bytes)
//     uint256 totalSupply;                   // slot 2
//     address owner;                         // slot 3 (wastes 12 bytes)
//     bool paused;                           // slot 4 (wastes 31 bytes)
//     uint128 fee;                           // slot 5 (wastes 16 bytes)
//     string name;                           // slot 6+
    
//     // Could pack decimals + owner + paused in 1 slot
//     // Could pack fee with other small values
// }

// contract ComplexPacking {
//     bool isActive;          // slot 0 (1 byte) - waste 31 bytes!
//     uint256 totalSupply;    // slot 1 (32 bytes)
//     uint8 decimals;         // slot 2 (1 byte) - waste 31 bytes!
//     address owner;          // slot 3 (20 bytes) - waste 12 bytes!
//     uint16 version;         // slot 4 (2 bytes) - waste 30 bytes!
//     uint64 timestamp;       // slot 5 (8 bytes) - waste 24 bytes!
//     bool isPaused;          // slot 6 (1 byte) - waste 31 bytes!
//     // Total: 7 slots (should be 3 slots)
//     // Optimal: [totalSupply] [owner+version+isPaused+isActive+decimals] [timestamp+remaining]
// }

// contract ConstantsOnly {
//     uint256 public constant MAX_SUPPLY = 1000000;
//     address public immutable deployer;
//     uint8 public constant DECIMALS = 18;
    
//     constructor() {
//         deployer = msg.sender;
//     }
//     // Total: 0 storage slots used
// }

// // Test case 6: Mixed constants and storage variables
// contract MixedConstantsStorage {
//     uint256 public constant RATE = 100;        // ignored
//     address public immutable factory;          // ignored
    
//     uint8 fee;              // slot 0 (1 byte) - waste 31 bytes!
//     uint256 balance;        // slot 1 (32 bytes)
//     bool enabled;           // slot 2 (1 byte) - waste 31 bytes!
//     address token;          // slot 3 (20 bytes) - waste 12 bytes!
//     // Total: 4 slots (should be 2 slots)
    
//     constructor(address _factory) {
//         factory = _factory;
//     }
// }

// // Test case 7: Large numbers of small variables
// contract ManySmallVars {
//     bool flag1;             // slot 0
//     bool flag2;             // slot 1
//     bool flag3;             // slot 2
//     bool flag4;             // slot 3
//     uint8 value1;           // slot 4
//     uint8 value2;           // slot 5
//     uint8 value3;           // slot 6
//     uint16 counter;         // slot 7
//     // Total: 8 slots (should be 1 slot!)
//     // All can fit in one slot: 4 bools + 3 uint8 + 1 uint16 = 1+1+1+1+1+1+1+2 = 9 bytes < 32 bytes
// }

// // Test case 8: Bytes types
// contract BytesTypes {
//     bytes1 hash1;           // slot 0 (1 byte) - waste 31 bytes!
//     bytes4 selector;        // slot 1 (4 bytes) - waste 28 bytes!
//     bytes8 data;            // slot 2 (8 bytes) - waste 24 bytes!
//     bytes32 fullHash;       // slot 3 (32 bytes)
//     // Total: 4 slots (should be 2 slots)
//     // Optimal: [hash1+selector+data+padding] [fullHash]
// }

// // Test case 9: Edge case - exactly 32 bytes
// contract ExactFit {
//     uint128 value1;         // 16 bytes
//     uint64 value2;          // 8 bytes
//     uint32 value3;          // 4 bytes
//     uint16 value4;          // 2 bytes
//     uint8 value5;           // 1 byte
//     bool flag;              // 1 byte
//     // Total: 32 bytes exactly = 1 slot (optimal)
// }

// // Test case 10: Arrays and mappings (should be ignored for packing)
// contract ArraysAndMappings {
//     mapping(address => uint256) balances;  // slot 0 (special storage)
//     uint256[] dynamicArray;                // slot 1 (special storage)
//     uint8 simpleVar;                       // slot 2 (1 byte) - waste 31 bytes!
//     bool flag;                             // slot 3 (1 byte) - waste 31 bytes!
//     // Only simpleVar and flag should be considered for packing
// }