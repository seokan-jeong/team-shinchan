# Testing Rules

Operational checklist for writing and maintaining tests.

---

### R-1: Test Before and After Changes
Run existing tests before making changes to establish a baseline. Run all tests after changes to verify no regressions.

### R-2: One Assertion Per Concept
Each test should verify one behavior or scenario. Multiple assertions are fine if they all test the same concept, but avoid testing unrelated behaviors in one test.

### R-3: Test Edge Cases
Always test: empty inputs, null/undefined values, boundary values (0, -1, MAX_INT), invalid types, and concurrent access where applicable.

### R-4: Descriptive Test Names
Test names should describe the scenario and expected outcome: `should return empty array when input is null`, not `test1` or `testSearch`.

### R-5: No Test Interdependence
Tests must not depend on execution order or shared mutable state. Each test should set up its own data and clean up after itself.

### R-6: Mock External Dependencies
Isolate the unit under test by mocking databases, APIs, file systems, and network calls. Test integration separately with dedicated integration tests.

### R-7: Test Public Interfaces
Focus tests on public methods and exported functions. Testing private internals creates brittle tests that break on refactoring.

### R-8: Cover Error Paths
Write explicit tests for error conditions: invalid input, network failures, timeout scenarios, permission denied. Error paths are where bugs hide.

### R-9: Keep Tests Fast
Unit tests should run in milliseconds. Move slow tests (network, database, filesystem) to integration test suites with separate runners.

### R-10: No Logic in Tests
Tests should be straightforward: setup, action, assertion. Avoid conditionals, loops, or complex logic in test code. If test setup is complex, use helper functions.

### R-11: Test New Public Functions
Every new public function or exported symbol must have at least one test covering the happy path and one covering an error path.

### R-12: Maintain Test Parity
When modifying a function's behavior, update its tests to match. Outdated tests are worse than no tests because they give false confidence.

### R-13: Use Factories for Test Data
Create helper functions or fixtures for generating test data. Avoid copy-pasting large data objects across tests.
