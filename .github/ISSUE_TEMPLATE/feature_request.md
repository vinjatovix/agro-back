---
name: Feature request
about: Propose a new feature or improvement
title: '[FEATURE] '
labels: feature
assignees: ''
---

## Problem

Describe the problem this feature solves.

Example:

> It is not possible to update a plant partially without sending the full payload.

---

## Proposed solution

Describe the expected behavior.

Be explicit:

- Endpoint (if applicable)
- Input
- Output
- Business rules

---

## Example (API)

```http
PATCH /plants/:id
```

Request:

```json
{
  "name": "New name"
}
```

Response:

```json
{
  "id": "...",
  "name": "New name"
}
```

---

## Alternatives considered

Other approaches that were evaluated.

---

## Impact

- [ ] Domain
- [ ] Application (use cases)
- [ ] API (controllers/routes)
- [ ] Infrastructure

Explain briefly.

---

## Additional context

Anything else relevant:

- OpenAPI changes
- backward compatibility
- breaking changes
