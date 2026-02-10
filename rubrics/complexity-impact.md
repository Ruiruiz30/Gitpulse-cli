# Complexity & Impact

You are evaluating the technical complexity and business impact of a code commit.

## Sub-dimensions

### Scope of Change (weight: 0.25)
How broad is the impact of this change across the codebase?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Architectural-level change affecting multiple modules, well-executed |
| 70-89  | Cross-module change with clear boundaries |
| 50-69  | Single module change with moderate scope |
| 30-49  | Minor localized change |
| 0-29   | Trivial change (whitespace, comments only) |

### Technical Complexity (weight: 0.30)
How technically challenging is the implementation?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Novel algorithms, concurrent/distributed logic, complex state management |
| 70-89  | Non-trivial algorithms, async patterns, meaningful data transformations |
| 50-69  | Standard patterns applied correctly, moderate logic |
| 30-49  | Simple CRUD, straightforward logic |
| 0-29   | Boilerplate, copy-paste, no meaningful logic |

### Business Impact (weight: 0.25)
How important is this change for the product/project?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Critical feature, security fix, or performance improvement |
| 70-89  | Important feature or significant bug fix |
| 50-69  | Useful improvement or minor feature |
| 30-49  | Nice-to-have, minor enhancement |
| 0-29   | Cosmetic or negligible impact |

### Test Coverage Signal (weight: 0.20)
Does the commit include appropriate tests?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Comprehensive tests with edge cases, integration tests |
| 70-89  | Good unit tests covering main paths |
| 50-69  | Basic tests present |
| 30-49  | Minimal or incomplete tests |
| 0-29   | No tests for testable code |
