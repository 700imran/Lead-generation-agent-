# Agency control plane

Hermes remains the main execution runtime. This layer defines the agency organization, bounded action loops, subagent roles, state/event contracts and Admin controls.

The Cloudflare Worker is the control/dashboard plane; it does not execute the Hermes Python runtime.
