---
name: eng-logging
description: Use when implementing logging in application code. Covers log level selection, structured logging, error tracking integration, and avoiding noise.
tier: domain
globs:
  - "**/logger*"
  - "**/logging*"
  - "**/*.service.*"
  - "**/*.controller.*"
  - "**/*.handler.*"
  - "**/*.worker.*"
  - "**/*.middleware.*"
  - "**/*.interceptor.*"
alwaysApply: false
---

# Logging Best Practices

**PURPOSE**: Guidelines for appropriate log levels and structured logging to keep error tracking actionable and signal-to-noise ratio high.

---

## Core Principle

**Errors should be actionable. Warnings are informational.**

- **`logger.error()`** -- Goes to error tracking (Sentry, Datadog, etc.) -- Requires human action
- **`logger.warn()`** -- Goes to logs only -- FYI, already handled
- **`logger.info()`** -- Significant state changes -- standard operational visibility
- **`logger.debug()`** -- Detailed diagnostics -- verbose, off in production by default

---

## When to Use Each Level

### ERROR: Actionable failures that need attention

Use `logger.error()` when the situation **requires immediate investigation or action**:

- **Fatal errors** that crash the application or prevent it from starting
- **Unhandled errors** that are thrown or rethrown to the caller
- **Data integrity violations** -- missing required data, corrupt state
- **Security violations** -- unauthorized access attempts, IDOR, injection detection
- **Unexpected system state** -- infrastructure failures with no fallback

**Rule of thumb**: If you log it as error, someone should investigate. If nobody needs to investigate, it's not an error.

### WARN: Expected edge cases that might need attention

Use `logger.warn()` when the application **handles the error gracefully** and continues:

- **Errors with fallback behavior** -- degraded mode, default values
- **Retry/reconnect logic** -- temporary failures with automatic recovery
- **Optional features that fail** -- non-critical integrations unavailable
- **Non-critical background operations** -- fire-and-forget tasks that fail
- **Validation errors returned to the user** -- the user sees the error, no investigation needed
- **External service failures with defaults** -- graceful degradation
- **Deprecated usage** -- code paths that still work but should be migrated
- **Lock/resource release failures** -- when auto-cleanup will handle it

### INFO: Significant state changes

Use `logger.info()` for operational visibility into what the application is doing:

- **Request lifecycle** -- received, completed (with duration)
- **Authentication events** -- user signed in, token refreshed
- **Job/task lifecycle** -- started, completed, failed (with context)
- **Configuration changes** -- feature flag toggled, setting updated
- **Service startup/shutdown** -- listening on port, graceful shutdown initiated
- **Significant business events** -- order placed, payment processed, export completed

**Rule of thumb**: If you were investigating a production issue, what would you want to see in the logs? That's info.

### DEBUG: Detailed diagnostics

Use `logger.debug()` for verbose information useful during development or troubleshooting:

- **Query parameters** -- what was sent to the database or API
- **Intermediate state** -- values at key decision points
- **Cache hits/misses** -- detailed caching behavior
- **Routing decisions** -- which handler was selected and why
- **Serialization/deserialization** -- input/output transformation details

---

## Structured Logging

Always include context with log messages. Structured fields are searchable; prose embedded in strings is not.

**Include these fields when available:**

| Field | When | Why |
|-------|------|-----|
| `requestId` | Any request-scoped operation | Correlate logs across a single request |
| `userId` | User-initiated actions | Know who was affected |
| `entity` / `entityId` | Entity operations | Know what was affected |
| `operation` | Service methods | Know what was attempted |
| `duration` | Timed operations | Spot slow operations |
| `error` | Catch blocks | Preserve stack trace and error type |

**Good -- structured context:**
```
logger.error('Failed to process payment', {
  requestId,
  userId,
  orderId,
  amount,
  error: error.message,
  stack: error.stack,
});
```

**Bad -- buried context in string:**
```
logger.error(`Failed to process payment for user ${userId} order ${orderId}`);
```

The bad example loses the ability to filter/search by userId or orderId in log aggregation tools.

---

## What NOT to Log

### Never log these:

- **PII** -- email addresses, full names, phone numbers, addresses (unless explicitly required and compliant)
- **Secrets** -- API keys, tokens, passwords, connection strings
- **Session identifiers** -- raw session tokens, JWTs, auth cookies
- **Payment details** -- card numbers, bank accounts, CVVs
- **Health data** -- any PHI/HIPAA-regulated information

### Mask or redact when necessary:

- Show only last 4 characters of tokens: `token: "...abc123"`
- Use user IDs instead of names: `userId: "usr_123"` not `user: "Jane Doe"`
- Hash or omit request bodies that may contain sensitive form data

---

## Avoiding Noise

### Don't log expected 404s as errors

A user requesting a resource that doesn't exist is normal. The 404 response is the correct behavior. Don't treat it as an error.

```
// BAD -- logs error for normal operation
user = findById(id);
if (!user) {
  logger.error('User not found');  // This is not an error!
  throw NotFoundException('User not found');
}

// GOOD -- no log needed, the exception is the response
user = findById(id);
if (!user) {
  throw NotFoundException('User not found');
}
```

### Don't log every successful operation

Info logs for every database query, every cache hit, or every successful API call create noise that drowns out the signal.

```
// BAD -- noise
logger.info('Successfully fetched user');
logger.info('Successfully updated user');
logger.info('Cache hit for user');

// GOOD -- log the boundary, not every step
logger.info('Request completed', { requestId, duration, status: 200 });
```

### Don't duplicate error logs

If you log an error and then throw it, the caller will likely log it again. Log at the point where the error is handled, not at every level it passes through.

```
// BAD -- logged twice (here and in the caller's catch block)
try {
  result = await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error);
  throw error;  // Caller will also log this!
}

// GOOD -- let the handler log it
try {
  result = await riskyOperation();
} catch (error) {
  throw new ServiceException('Operation failed', { cause: error });
}
// The top-level error handler logs it once
```

---

## Decision Tree

```
Does the error prevent the operation from completing successfully?
|-- Yes --> Is the error thrown/rethrown?
|   |-- Yes --> logger.error()
|   +-- No --> Does the user get an error response?
|       |-- Yes --> logger.warn()
|       +-- No --> logger.error()
+-- No --> Has the error been handled?
    |-- Yes (fallback/retry/default) --> logger.warn()
    +-- No --> logger.error()
```

---

## Error Tracking Integration

`logger.error()` should be the threshold for alerting tools (Sentry, Datadog, PagerDuty, etc.). This means:

- Every `logger.error()` call may trigger an alert -- make sure it's worth someone's attention
- Every `logger.warn()` is visible in log aggregation but does NOT page anyone
- If your error tracker is noisy, the fix is to downgrade the log levels that shouldn't be errors, not to silence the tracker

---

## Summary Checklist

Before using `logger.error()`, ask:
- [ ] Does this prevent the operation from succeeding?
- [ ] Is the error thrown or causes process exit?
- [ ] Does this require human investigation or action?
- [ ] Is there NO graceful fallback or default value?

If you answered "yes" to all, use **ERROR**. Otherwise, use **WARN**.

**Remember**: If the application keeps working (with fallback/default/retry), it's a **WARN**, not an **ERROR**.
