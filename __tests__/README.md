# Auto Bot Creator - Test Suite

This directory contains comprehensive tests for the Auto Bot Creator feature.

## Directory Structure

```
__tests__/
├── services/               # Unit tests for service layer
│   ├── stockScreener.test.ts       (15 test cases)
│   └── strategyMatcher.test.ts     (12 test cases)
│
├── api/                    # Integration tests for API endpoints
│   ├── stocks-screener.test.ts     (12 test cases)
│   └── bots-bulk.test.ts           (15 test cases)
│
├── e2e/                    # End-to-end browser tests
│   └── (awaiting frontend implementation)
│
├── regression/             # Critical regression tests
│   └── existing-features.test.ts   (20+ test cases)
│
├── performance/            # Performance benchmarks
│   └── (to be implemented)
│
├── security/               # Security validation tests
│   └── (to be implemented)
│
├── fixtures/               # Test data and helpers
│   └── (shared test data)
│
└── mocks/                  # Mock API responses
    └── (mock data for external APIs)
```

## Quick Start

### First Time Setup

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest ts-jest @playwright/test identity-obj-proxy

# Install Playwright browsers
npx playwright install chromium
```

### Running Tests

```bash
# Run all tests
npm test

# Run service tests only
npm run test:services

# Run API tests only
npm run test:api

# Run regression tests (CRITICAL before commit)
npm run test:regression

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Status

| Test Suite | Status | Coverage | Priority |
|------------|--------|----------|----------|
| Stock Screener Service | ⏳ Ready for implementation | - | P0 |
| Strategy Matcher Service | ⏳ Ready for implementation | - | P0 |
| Stock Screener API | ⏳ Ready for implementation | - | P0 |
| Bulk Bot Creation API | ⏳ Ready for implementation | - | P0 |
| Regression Tests | ✅ Executable now | - | P0 |
| E2E Tests | 📋 Planned | - | P1 |

## Test Templates

All test files are **ready-to-use templates** with:
- ✅ Comprehensive test cases defined
- ✅ Mock data and setup code
- ✅ Clear documentation and TODOs
- ✅ AAA (Arrange-Act-Assert) pattern
- ✅ Error scenarios and edge cases

### Usage Instructions

1. **Backend architect implements service/API**
2. **Test engineer uncomments imports in test file**
3. **Test engineer replaces placeholder expectations with actual calls**
4. **Run tests**: `npm test -- <test-file-name>`
5. **Fix any failures**
6. **Verify coverage**: `npm run test:coverage`

## Test Coverage Goals

- **Minimum**: 70% (blocks PR merge)
- **Target**: 80%
- **Critical paths**: 90%+

## Important Notes

### For Backend Architect

When implementing services:
1. Check corresponding test file first
2. Implement service to match test expectations
3. Update test file imports
4. Run tests to verify
5. Add any edge cases discovered

### For Frontend Developer

When implementing UI:
1. E2E test templates will be created after UI is ready
2. Focus on data-testid attributes for easy selection
3. Follow accessibility best practices
4. Test responsive design on multiple screen sizes

### For Test Engineer

Test maintenance checklist:
- [ ] Update test files after implementation
- [ ] Run full test suite before PR
- [ ] Verify regression tests pass
- [ ] Check coverage meets threshold
- [ ] Document any new edge cases found

## Regression Tests (CRITICAL)

**Location**: `/Users/jeonghonoh/Documents/newnomad/moneygoku/__tests__/regression/existing-features.test.ts`

These tests ensure the Auto Bot Creator feature does NOT break existing functionality:

- Manual bot creation
- Bot status management
- Strategy retrieval
- Trade recording
- Position management
- Database integrity

**MUST PASS** before merging any changes!

## Continuous Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

See `.github/workflows/test-auto-bot-creator.yml` for CI configuration.

## Documentation

- **Strategy**: `/Users/jeonghonoh/Documents/newnomad/moneygoku/TEST_STRATEGY_AUTO_BOT_CREATOR.md` (27KB)
- **Guide**: `/Users/jeonghonoh/Documents/newnomad/moneygoku/TESTING_GUIDE.md` (11KB)
- **Summary**: `/Users/jeonghonoh/Documents/newnomad/moneygoku/TEST_EXECUTION_SUMMARY.md` (11KB)
- **Quick Ref**: `/Users/jeonghonoh/Documents/newnomad/moneygoku/QUICK_TEST_REFERENCE.md` (6KB)

## Automated Test Script

```bash
# Run comprehensive test suite with reporting
./scripts/test-auto-bot-creator.sh
```

This script:
- Runs all test phases in order
- Generates coverage report
- Creates test execution report
- Provides color-coded output
- Fails fast on critical errors

## Need Help?

1. **Quick commands**: See `QUICK_TEST_REFERENCE.md`
2. **Detailed guide**: See `TESTING_GUIDE.md`
3. **Full strategy**: See `TEST_STRATEGY_AUTO_BOT_CREATOR.md`
4. **Troubleshooting**: See `TESTING_GUIDE.md` → "Troubleshooting" section

## Contributing

When adding new tests:

1. Follow existing patterns (AAA, descriptive names)
2. Add to appropriate directory
3. Include success, error, and edge case scenarios
4. Document expected behavior
5. Update this README if adding new categories

## Test Principles

1. **Isolation**: Tests should not depend on each other
2. **Speed**: Unit tests should be fast (< 100ms)
3. **Clarity**: Test names should explain what's being tested
4. **Coverage**: Test both happy path and error cases
5. **Maintenance**: Keep tests up-to-date with code changes

---

**Status**: Ready for implementation testing
**Last Updated**: 2025-10-09
**Maintainer**: Test Engineering Team
