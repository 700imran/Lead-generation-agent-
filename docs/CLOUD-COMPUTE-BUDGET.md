# Cloud Compute Cost Controls

Every meaningful task should carry a cost budget at task, client, daily and monthly levels.

Use:
- cheap/fast model routing for routine work
- reasoning models only when justified
- caching and deduplication
- batching
- bounded retries
- concurrency limits
- scheduled non-urgent work
- token/output caps
- tool timeouts

If a task would exceed the configured budget, pause it and request Admin approval rather than silently increasing spend.
