# MODULE: ARCHITECTURE BOUNDARIES

version: 1.0.0

---

# 1. PURPOSE

Defines strict separation rules.

---

# 2. RULES

- Domain has no IO
- Spatial has no persistence
- API has no domain leakage
- Events are append-only

---

# 3. ENFORCEMENT

- no DTO in domain
- no repository in spatial
- no express in domain

---

# 4. GOAL

Prevent architectural erosion