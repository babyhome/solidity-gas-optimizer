# Contributing to Solidity Gas Optimizer

First off, thank you for considering contributing! 🎉

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- Solidity version
- Contract code that reproduces the issue
- Expected vs actual behavior
- Error messages

### 💡 Suggesting New Rules

We're always looking for new gas optimization patterns! When suggesting a rule:

1. Provide example code showing the inefficient pattern
2. Explain why it's inefficient
3. Show the optimized version
4. Estimate gas savings

### 🔧 Pull Requests

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-rule`)
3. Commit your changes (`git commit -m 'Add amazing rule'`)
4. Push to the branch (`git push origin feature/amazing-rule`)
5. Open a Pull Request

### 📝 Code Style

- Use TypeScript
- Follow existing code patterns
- Add tests for new rules
- Update documentation

## Development Setup

```bash
git clone https://github.com/babyhome/solidity-gas-optimizer.git
cd solidity-gas-optimizer
npm install
npm run dev -- analyze test/contracts/Example.sol
```

## Adding a New Rule

1. Create file in `src/rules/your-rule.ts`
2. Extend `BaseRule` class
3. Add to `src/rules/index.ts`
4. Add test contract in `test/contracts/`
5. Update README.md

Example:
```typescript
export class YourRule extends BaseRule {
  getName() { return 'your-rule'; }
  getDescription() { return 'Description'; }
  getVisitors() { /* ... */ }
}
```

## Testing

```bash
# Run tests
npm test

# Test specific rule
npm run dev -- analyze test/contracts/YourTest.sol --rules your-rule
```

## Questions?

Feel free to open an issue or reach out!