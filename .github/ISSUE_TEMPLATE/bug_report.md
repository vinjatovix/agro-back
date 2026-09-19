---
name: Bug report
about: Report a bug in the API or domain logic
title: '[BUG] '
labels: bug
assignees: ''
---

## Description

Clear and concise description of the issue.

---

## Steps to reproduce

Provide a minimal reproducible scenario.

Example:

1. Send request:

```

POST /plants
{
    "name": ""
}

```

1. Observe response

---

## Expected behavior

What should happen according to:

- business rules
- OpenAPI spec
- existing behavior

---

## Actual behavior

What is currently happening.

Include:

- HTTP status
- response body

---

## Environment

- Node version:
- Execution mode: (local / docker)
- Branch / commit:

---

## Logs / Errors

Paste relevant logs or stack traces.

```bash
# example
Unexpected error at error handler...
```

---

## Additional context

Anything else that may help:

- related PRs
- related issues
- edge cases
