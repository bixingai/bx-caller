# bx-caller API Documentation

All REST endpoints are mounted under `/api` in the bx-caller container.
Production nginx exposes them under `/bx-caller/api/*` and strips the
`/bx-caller` prefix before proxying.

HTTP requests require the Bixing Tools portal `access_token` cookie, signed with
the shared `PORTAL_JWT_SECRET`. Local development may set `DEV_BYPASS_AUTH=1`.

## Endpoints

### Get Agent

Retrieves an agent's information by agent id.

**Endpoint:** `GET /api/agent/{agent_id}`

**Parameters:**

- `agent_id` (path) - string, required: unique identifier of the agent
- `include_prompts` (query) - boolean, optional: when `true`, returns an
  editable draft envelope with both `agent_config` and persisted
  `agent_prompts`. The default response remains the legacy agent config.

**Editable draft response:**

```json
{
  "agent_config": {
    "agent_name": "Alfred",
    "agent_type": "other",
    "tasks": []
  },
  "agent_prompts": {
    "task_1": {
      "system_prompt": "Why Do We Fall, Sir? So That We Can Learn To Pick Ourselves Up."
    }
  }
}
```

### Create Agent

Creates a new agent with the Bolna-compatible configuration.

**Endpoint:** `POST /api/agent`

**Request Body:**

```json
{
  "agent_config": {
    "agent_name": "Alfred",
    "agent_type": "other",
    "tasks": [
      {
        "task_type": "conversation",
        "toolchain": {
          "execution": "parallel",
          "pipelines": [["transcriber", "llm", "synthesizer"]]
        },
        "tools_config": {
          "input": { "format": "wav", "provider": "twilio" },
          "output": { "format": "wav", "provider": "twilio" },
          "transcriber": {
            "encoding": "linear16",
            "language": "en",
            "provider": "deepgram",
            "stream": true
          },
          "llm_agent": {
            "agent_type": "simple_llm_agent",
            "agent_flow_type": "streaming",
            "llm_config": {
              "provider": "openai",
              "model": "gpt-4o-mini",
              "request_json": true
            }
          },
          "synthesizer": {
            "audio_format": "wav",
            "provider": "elevenlabs",
            "stream": true,
            "provider_config": {
              "voice": "George",
              "model": "eleven_turbo_v2_5",
              "voice_id": "JBFqnCBsd6RMkjVDRZzb"
            },
            "buffer_size": 100.0
          }
        },
        "task_config": {
          "hangup_after_silence": 30.0
        }
      }
    ],
    "agent_welcome_message": "How are you doing Bruce?"
  },
  "agent_prompts": {
    "task_1": {
      "system_prompt": "Why Do We Fall, Sir? So That We Can Learn To Pick Ourselves Up."
    }
  }
}
```

**Response:**

```json
{
  "agent_id": "uuid-string",
  "state": "created"
}
```

### Edit Agent

Updates an existing agent owned by the current portal user.

**Endpoint:** `PUT /api/agent/{agent_id}`

The request body matches Create Agent.

### Delete Agent

Deletes an agent owned by the current portal user.

**Endpoint:** `DELETE /api/agent/{agent_id}`

**Response:**

```json
{
  "agent_id": "uuid-string",
  "state": "deleted"
}
```

### List Agents

Retrieves all agents owned by the current portal user.

**Endpoint:** `GET /api/agents`

Compatibility alias: `GET /api/all`

**Response:**

```json
{
  "agents": [
    {
      "agent_id": "uuid-string",
      "data": {
        "agent_name": "Alfred",
        "agent_type": "other",
        "tasks": []
      }
    }
  ]
}
```

### Place Outbound Call

Starts an outbound phone call through the configured telephony provider.

**Endpoint:** `POST /api/calls/outbound`

**Request Body:**

```json
{
  "agent_id": "uuid-string",
  "to": "+19495080666",
  "provider": "twilio"
}
```

**Response:**

```json
{
  "provider": "twilio",
  "call_id": "CA...",
  "status": "queued"
}
```

The first implementation supports `provider="twilio"`. Future adapters can
implement the same service boundary for SIP trunks, Plivo, or China/APAC
carrier integrations.

### Provider Readiness

Reports whether the configured outbound provider has the settings needed for a
controlled launch.

**Endpoint:** `GET /api/provider-readiness`

**Response:**

```json
{
  "provider": "twilio",
  "ready": false,
  "missing": ["TWILIO_AUTH_TOKEN"]
}
```

### Contacts

Contacts are scoped to the current portal user.

**Endpoints:**

- `GET /api/contacts`
- `POST /api/contacts`
- `GET /api/contacts/{contact_id}`
- `PUT /api/contacts/{contact_id}`
- `DELETE /api/contacts/{contact_id}`

**Create/update body:**

```json
{
  "name": "Maya Chen",
  "phone_number": "+15551234567",
  "email": "maya@example.com",
  "company": "Northwind",
  "tags": ["renewal"],
  "notes": "Prefers morning calls"
}
```

### Campaigns

Campaigns assign a persisted contact audience to an existing agent.

**Endpoints:**

- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/{campaign_id}`
- `PUT /api/campaigns/{campaign_id}`
- `POST /api/campaigns/{campaign_id}/launch`

**Create/update body:**

```json
{
  "name": "June Renewal Outreach",
  "agent_id": "uuid-string",
  "contact_ids": ["contact-uuid"],
  "script": "AI renewal and follow-up call",
  "schedule": "immediate"
}
```

Campaign launch requires explicit compliance acknowledgment:

```json
{
  "compliance_ack": true,
  "provider": "twilio"
}
```

Launch validates provider readiness, campaign ownership, contact existence, and
agent ownership before placing calls. The response includes the updated campaign
and created call session records.

### Call Sessions

Lists outbound call attempts created by campaign launch.

**Endpoint:** `GET /api/call-sessions`

**Response:**

```json
{
  "call_sessions": [
    {
      "id": "session-uuid",
      "campaign_id": "campaign-uuid",
      "agent_id": "agent-uuid",
      "contact_id": "contact-uuid",
      "contact_name": "Maya Chen",
      "to_number": "+15551234567",
      "provider": "twilio",
      "provider_call_id": "CA...",
      "status": "queued",
      "created_at": "2026-06-03T12:00:00Z",
      "updated_at": "2026-06-03T12:00:00Z"
    }
  ]
}
```

### Audit Logs

Lists append-only operational audit records for the current portal user.

**Endpoint:** `GET /api/audit-logs`

The MVP writes audit events for contact mutations, campaign mutations, campaign
launch, and call session creation.

### Twilio Connect Callback

Returns TwiML that connects Twilio Media Streams to the bx-caller voice
WebSocket.

**Endpoint:** `GET|POST /api/telephony/twilio/connect`

**Parameters:**

- `agent_id` (query) - string, required: agent id to run
- `token` (query) - string, required when `WEBSOCKET_ACCESS_TOKEN` is set

Twilio receives this URL from the outbound call request. The callback returns a
`<Connect><Stream>` response targeting:

```text
wss://tools.bixingai.com/bx-caller/chat/v1/{agent_id}?token=<WEBSOCKET_ACCESS_TOKEN>
```

### Voice WebSocket

Streams a live voice conversation for an existing agent.

**Endpoint:** `WS /chat/v1/{agent_id}`

Production path:

```text
wss://tools.bixingai.com/bx-caller/chat/v1/{agent_id}
```

Browser clients can rely on the portal cookie. External telephony callbacks that
cannot send the cookie may include `?token=<WEBSOCKET_ACCESS_TOKEN>` when that
secret is configured.
