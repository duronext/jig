---
name: eng-testing
description: Use when writing tests, designing test strategy, or reviewing test coverage. Covers test pyramid, naming, mocking, and flaky test policy.
tier: domain
globs:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/__tests__/**"
  - "**/test/**"
  - "**/tests/**"
  - "**/*.test/**"
  - "**/testing/**"
  - "**/fixtures/**"
  - "**/factories/**"
  - "**/*.mock.*"
  - "**/*.stub.*"
alwaysApply: false
---

# Test Strategy

**PURPOSE**: Language-agnostic guidelines for writing good tests -- which types to use when, how to structure them, and what to avoid.

---

## The Test Pyramid

```
         /  E2E  \          Few, slow, expensive
        /----------\        Critical user flows only
       / Integration \      Boundaries and contracts
      /----------------\    API, database, service interactions
     /      Unit        \   Many, fast, cheap
    /--------------------\  Pure logic, transformations, utilities
```

| Type | Speed | Scope | When to Write |
|------|-------|-------|---------------|
| **Unit** | Fast (ms) | Single function/class | Pure logic, transformations, calculations, parsing, validation |
| **Integration** | Medium (seconds) | Boundaries between systems | API endpoints, database queries, service-to-service calls, message queues |
| **E2E** | Slow (seconds-minutes) | Full user flows | Critical paths: login, checkout, data export, core business workflows |

### Choosing the Right Type

```
Is it pure logic with no external dependencies?
|-- Yes --> Unit test
+-- No --> Does it cross a system boundary?
    |-- Yes --> Does it represent a critical user flow?
    |   |-- Yes --> E2E test (and maybe also integration)
    |   +-- No --> Integration test
    +-- No --> Unit test (mock the boundary)
```

---

## Good Test Qualities

### Deterministic

Same input, same result. Every time. No flakiness.

- No dependence on system time without mocking
- No dependence on file system state without setup/teardown
- No dependence on network availability
- No dependence on test execution order

### Independent

Tests do not depend on each other. Each test sets up its own state and cleans up after itself.

- No shared mutable state between tests
- No assumptions about execution order
- Each test can run in isolation

### Fast

Unit tests should run in milliseconds. Integration tests in seconds. E2E tests are the only acceptable "slow" tests.

- Mock expensive operations in unit tests
- Use in-memory alternatives where possible
- Avoid unnecessary setup/teardown

### Descriptive Names

Test names describe WHAT is being tested and WHAT should happen. Read the name and know what broke without reading the test body.

```
-- GOOD: describes behavior
"returns empty array when no items match the filter"
"throws validation error when email format is invalid"
"retries up to 3 times on transient network failure"

-- BAD: describes implementation or is vague
"test filter"
"works correctly"
"handles error"
"test case 1"
```

### Test Behavior, Not Implementation

Tests should verify what the code does, not how it does it. Implementation can change; behavior should not.

```
-- GOOD: tests the outcome
"after adding an item, the list contains that item"
"after deletion, the item is no longer retrievable"

-- BAD: tests the mechanism
"calls array.push with the item"
"sets the deleted flag to true"
```

---

## Arrange-Act-Assert

Every test follows this structure:

```
// Arrange -- set up the preconditions
input = createValidInput();
service = createServiceWithMocks();

// Act -- perform the action being tested
result = service.process(input);

// Assert -- verify the outcome
expect(result.status).toBe('completed');
expect(result.items).toHaveLength(3);
```

**One act per test.** If you need multiple acts, you need multiple tests.

---

## What to Test

### Always test:

- **Happy path** -- the normal, expected flow works correctly
- **Error cases** -- invalid input, missing data, unauthorized access, service failures
- **Edge cases** -- empty collections, null/undefined values, boundary values (0, -1, MAX_INT)
- **Boundary values** -- off-by-one, limits, thresholds

### Prioritize testing:

- **New functions and methods** -- any new public API surface needs tests
- **Bug fixes** -- write a test that reproduces the bug BEFORE fixing it
- **Complex conditionals** -- if/else chains, switch statements, ternary expressions
- **Error handling paths** -- catch blocks, fallback behavior, retry logic
- **State transitions** -- anything that changes state based on input

### Don't test:

- **Framework internals** -- don't test that your router routes or your ORM queries
- **Trivial getters/setters** -- a method that returns a property needs no test
- **Third-party libraries** -- don't test that JSON.parse works
- **Type-only code** -- interfaces, type aliases, and type guards (unless they have runtime behavior)
- **Configuration constants** -- a list of allowed values is not behavior

---

## Mocking Strategy

### Mock at boundaries, not internally

Boundaries are the edges where your code meets external systems:

| Boundary | Mock It |
|----------|---------|
| Database | Yes -- use test database or in-memory alternative |
| HTTP APIs | Yes -- mock the HTTP client or use recorded responses |
| File system | Yes -- use in-memory FS or temp directories |
| Message queues | Yes -- use in-memory broker or mock publisher |
| Time/dates | Yes -- freeze or inject time |
| Random values | Yes -- seed or inject |

### Don't mock internal functions

If you're mocking a function in the same module to test another function in that module, the test is too coupled to the implementation. Refactor the code or test the outer function end-to-end.

```
-- BAD: mocking internals
mock(module, 'helperFunction').returns(42);
result = module.mainFunction();
expect(result).toBe(42);

-- GOOD: test the actual behavior
result = module.mainFunction(inputThatProducesFortyTwo);
expect(result).toBe(42);
```

### Mock setup belongs in the test

Each test should clearly show what it mocks. Shared mock setup in beforeEach is fine for common dependencies (database, logger), but test-specific mock behavior should be in the test itself.

---

## Flaky Test Policy

**Fix or delete. Never skip and forget.**

A flaky test is worse than no test -- it erodes trust in the entire test suite. When tests are unreliable, developers stop paying attention to failures.

### When a test is flaky:

1. **Mark it** with a skip annotation AND a comment explaining why
2. **File a ticket** to fix it (not "someday" -- with a deadline)
3. **Fix the root cause** -- usually: timing, shared state, network dependency, or test order
4. **If unfixable**: delete the test and document what manual verification replaces it

### Common causes of flakiness:

| Cause | Fix |
|-------|-----|
| Timing/race conditions | Use explicit waits, not sleeps. Mock time. |
| Shared database state | Isolate with transactions, use unique identifiers |
| Test execution order | Ensure each test has proper setup/teardown |
| Network dependencies | Mock external calls, use recorded responses |
| Port conflicts | Use dynamic port allocation |
| File system state | Use temp directories, clean up in afterEach |

---

## Test Organization

### File placement

Tests should live close to the code they test. The two common patterns:

```
-- Colocated (preferred for unit tests)
src/
  user.service.ts
  user.service.test.ts

-- Separate directory (common for integration/E2E)
src/
  user.service.ts
tests/
  integration/
    user.service.integration.test.ts
  e2e/
    user-flow.e2e.test.ts
```

### Test file naming

Match the source file name with a `.test` or `.spec` suffix. Be consistent within the project.

### Describe/context blocks

Group related tests. Use nesting to show precondition variations:

```
describe('UserService')
  describe('createUser')
    it('creates a user with valid input')
    it('throws when email is already taken')
    it('throws when required fields are missing')

  describe('deleteUser')
    describe('when user exists')
      it('removes the user')
      it('returns the deleted user')
    describe('when user does not exist')
      it('throws not found error')
```

---

## Coverage

### Target meaningful coverage, not a number

100% coverage is not a goal. Coverage measures which lines executed, not whether the tests are good. A test that calls a function without asserting anything adds coverage but no value.

### Focus coverage on:

- Business logic and domain rules
- Error handling and edge cases
- Complex conditional paths
- Public API surfaces

### Don't chase coverage on:

- Configuration and bootstrapping code
- Simple delegation (calling one function that calls another)
- Framework boilerplate
- Type definitions
