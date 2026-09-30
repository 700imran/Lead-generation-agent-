# OrbitReach Website → Revenue Engine Connector

This connector is the boundary between a client website and that client's tenant-isolated revenue-engine instance.

## Flow

Visitor → website form/CTA → server-side connector → OrbitReach control endpoint → client revenue-engine instance → CRM/qualification/outreach workflow.

The browser must not receive the revenue-engine's private credentials. The connector should run server-side (or through a trusted backend/function), use signed requests, enforce allowed origins/rate limits, record consent/contact preferences, and attach `client_id`, `website_id` and `instance_id` to every event.

## Event contract

Supported events include:

- `lead.created`
- `lead.updated`
- `lead.consent.updated`
- `conversion.created`
- `qualification.requested`
- `demo.requested`

Minimum lead payload:

```json
{
  "event": "lead.created",
  "client_id": "client_123",
  "website_id": "site_123",
  "instance_id": "rev_123",
  "lead": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "company": "...",
    "message": "...",
    "source": "website",
    "consent": {"contact": true}
  }
}
```

Do not put provider secrets, CRM tokens or agent credentials in browser JavaScript.
