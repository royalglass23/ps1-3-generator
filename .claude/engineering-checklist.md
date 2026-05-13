# AI-Assisted Engineering Pre-Development Checklist

## Purpose

Ensure every system is designed with clarity, low risk, and long-term maintainability before writing code.

---

# 1. Business Understanding

* What exact problem are we solving?
* Who is affected?
* What is the cost of failure?
* What defines success?
* Is automation actually worth it?

---

# 2. Scope Control

* What is included?
* What is excluded?
* What is intentionally NOT being built?

---

# 3. Architecture

* What are system components?
* How does data flow?
* What external services exist?
* What are dependencies?

---

# 4. Failure Modes

* What breaks if an API fails?
* What happens on partial failure?
* What happens on bad data?
* What happens on downtime?
* Is recovery possible?

---

# 5. Security

* Are secrets protected?
* Is least privilege applied?
* Is input validated?
* Are APIs secure?
* Is production isolated?

---

# 6. Database Safety

* Are schemas correct and minimal?
* Are constraints defined?
* Are duplicates prevented?
* Are migrations safe?
* Are backups tested?

---

# 7. AI Code Rules

* Do I fully understand this code?
* Can I explain it without AI?
* Do I understand failure cases?
* Do I understand security impact?

Never blindly trust AI for:

* auth
* security
* database migrations
* infrastructure

---

# 8. Deployment

* Is rollback possible?
* Are backups verified?
* Are environments separated?
* Is deployment documented?

---

# 9. Maintainability

* Can someone else understand this?
* Are naming conventions consistent?
* Is logging sufficient?
* Is complexity justified?

---

# 10. Final Gate

If anything is unclear:
STOP before coding.

Clarify first. Simplify first.
