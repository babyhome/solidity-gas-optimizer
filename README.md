# 🚀 Solidity Gas Optimizer

[![npm version](https://img.shields.io/npm/v/solidity-gas-optimizer.svg)](https://www.npmjs.com/package/solidity-gas-optimizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful CLI tool that analyzes Solidity smart contracts to detect gas optimization opportunities. Save thousands in gas fees by identifying and fixing common inefficient patterns.

## ✨ Features

- 🔍 **Storage Read in Loops** - Detect expensive storage reads inside loops
- 🔐 **Public vs External** - Identify functions that should be `external` instead of `public`
- 📦 **State Variable Packing** - Find inefficient variable ordering that wastes storage slots
- 🚨 **Custom Errors** - Suggest replacing string reverts with gas-efficient custom errors
- 🎨 **Beautiful Output** - Color-coded results with detailed suggestions
- ⚡ **Fast Analysis** - Powered by AST parsing for accurate detection

## 📊 Real Impact

```solidity
// Before optimization: 103,320 gas
contract Unoptimized {
    uint128 a;      // slot 0 (wasted 128 bits)
    uint256 b;      // slot 1
    uint128 c;      // slot 2 (wasted 128 bits)
    
    function sum() public view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < array.length; i++) {  // 100 gas per iteration
            total += array[i];
        }
        return total;
    }
}

// After optimization: 23,420 gas (77% savings!)
contract Optimized {
    uint256 b;      // slot 0
    uint128 a;      // slot 1
    uint128 c;      // slot 1 (packed!)
    
    function sum() external view returns (uint256) {
        uint256 total = 0;
        uint256 length = array.length;  // Cache length
        for (uint i = 0; i < length; i++) {
            total += array[i];
        }
        return total;
    }
}
```

## 🛠️ Installation

### Global Installation (Recommended)
```bash
npm install -g solidity-gas-optimizer
```

### Local Installation
```bash
npm install --save-dev solidity-gas-optimizer
```

## 🚀 Quick Start

### Basic Usage
```bash
# Analyze a single file
gas-opt analyze contracts/Token.sol

# Analyze with specific rules
gas-opt analyze contracts/Token.sol --rules storage-read-in-loop,custom-errors

# List all available rules
gas-opt analyze --list-rules
```

### Example Output
```
╔═══════════════════════════════════════════════════╗
║          Solidity Gas Optimization Tool           ║
╚═══════════════════════════════════════════════════╝

✓ Analyzing: Token.sol

🔍 Gas Optimization Report

🔄 Storage Reads in Loops (2 issues)
──────────────────────────────────────────────────

[1] 🔴 HIGH at line 45
    Storage array length 'balances.length' is being read inside a loop condition

      45 │ for (uint i = 0; i < balances.length; i++) {
              ╰── here

    💡 Suggestion: Cache the array length before the loop:
       uint256 balancesLength = balances.length;
    ⛽ Gas Impact: ~2100 gas per iteration

📊 Summary Report
══════════════════════════════════════════════════
  Severity Distribution:
    High    │ ████████ 4
    Medium  │ ████ 2
    
  Optimization Score: 73/100
```

## 📋 Available Rules

| Rule | Description | Impact |
|------|-------------|---------|
| `storage-read-in-loop` | Detects storage variables read inside loops | HIGH |
| `public-vs-external` | Suggests using `external` for non-internal functions | MEDIUM |
| `state-variable-packing` | Identifies inefficient variable ordering | HIGH |
| `use-custom-errors` | Replaces string reverts with custom errors | MEDIUM |

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Adding New Rules
1. Create a new rule in `src/rules/`
2. Extend the `BaseRule` class
3. Add to rule registry
4. Submit a PR!

## 📈 Roadmap

- [x] Core rules implementation
- [x] Beautiful CLI output
- [ ] Config file support (v0.2.0)
- [ ] Auto-fix capability (v0.3.0)
- [ ] VS Code extension (v0.4.0)
- [ ] More optimization rules (ongoing)

## 📄 License

MIT © I'ts Beerz

---

<p align="center">
  Made with ❤️ for the Ethereum community
</p>