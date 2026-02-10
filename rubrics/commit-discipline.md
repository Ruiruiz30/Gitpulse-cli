# Commit Discipline

You are evaluating the commit practices and conventions followed in a code commit.

## Sub-dimensions

### Message Quality (weight: 0.30)
Does the commit message follow best practices (e.g., Conventional Commits)?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Perfect Conventional Commits format, clear scope, descriptive body |
| 70-89  | Good format, clear description, minor formatting issues |
| 50-69  | Understandable but doesn't follow conventions |
| 30-49  | Vague message, unclear purpose |
| 0-29   | Empty, meaningless, or misleading message |

### Commit Size (weight: 0.25)
Is the commit an appropriate size? (Optimal: 50-300 lines of effective change)

| Score Range | Criteria |
|-------------|----------|
| 90-100 | 50-200 lines, focused and complete |
| 70-89  | 200-300 lines or 30-50 lines, still well-scoped |
| 50-69  | 300-500 lines or 10-30 lines, somewhat large/small |
| 30-49  | 500-1000 lines or very small (<10 lines for non-trivial changes) |
| 0-29   | >1000 lines (too large) or trivially small |

### Atomicity (weight: 0.30)
Does the commit represent a single, logical change?

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Single responsibility, self-contained, could be reverted cleanly |
| 70-89  | Mostly single purpose, minor related changes included |
| 50-69  | Two related concerns mixed together |
| 30-49  | Multiple unrelated changes bundled |
| 0-29   | Kitchen sink commit, impossible to review in isolation |

### Frequency Pattern (weight: 0.15)
Is the commit part of a healthy submission pattern? (Evaluated at author level)

| Score Range | Criteria |
|-------------|----------|
| 90-100 | Regular daily commits, consistent rhythm |
| 70-89  | Mostly regular, occasional gaps |
| 50-69  | Somewhat irregular but not extreme |
| 30-49  | Infrequent with large dumps |
| 0-29   | Extremely irregular, months of silence then massive dumps |
