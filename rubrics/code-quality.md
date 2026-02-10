# Code Quality

You are evaluating the quality of a code commit diff.

## Sub-dimensions

### Readability (weight: 0.30)
How easy is the code to read and understand?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Excellent naming, self-documenting, clear control flow |
| 70-89  | Good naming, mostly clear, minor ambiguities |
| 50-69  | Acceptable but some unclear naming or logic |
| 30-49  | Poor naming, hard to follow logic |
| 0-29   | Unreadable, misleading names, tangled logic |

### Maintainability (weight: 0.25)
How easy will it be to maintain and extend this code?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Well-organized, DRY, appropriate abstractions, easy to modify |
| 70-89  | Good organization, minor duplication, reasonable structure |
| 50-69  | Some duplication, tightly coupled areas, but functional |
| 30-49  | Significant duplication, poor organization, hard to modify |
| 0-29   | Monolithic, heavily duplicated, extremely fragile |

### Best Practices (weight: 0.25)
Does the code follow industry best practices?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Proper error handling, secure, handles edge cases, follows SOLID |
| 70-89  | Good error handling, mostly secure, minor gaps |
| 50-69  | Basic error handling, some security concerns |
| 30-49  | Missing error handling, potential security issues |
| 0-29   | No error handling, security vulnerabilities, anti-patterns |

### Consistency (weight: 0.20)
Does the code follow the project's existing style and conventions?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Perfectly consistent with project style, enhances conventions |
| 70-89  | Mostly consistent, minor deviations |
| 50-69  | Mixed consistency, some style violations |
| 30-49  | Frequent inconsistencies with project style |
| 0-29   | Completely ignores project conventions |
