# Frontend Architecture

Date: 2026-05-09
Status: Draft for review

## Decision

Create a new frontend app inside this repo at `frontend/`.

Recommended stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-compatible component primitives where useful
- route base path `/bx-caller` for production
- local dev proxy to the FastAPI backend

This matches the Bixing Tools ecosystem, keeps deployment familiar, and supports
future server-side route handling if the app needs it.

## Repo Layout

```text
bx-caller/
├── app/                         # FastAPI backend
├── bolna/                       # voice-agent runtime
├── frontend/                    # new Next.js frontend
│   ├── src/app/                 # routes
│   ├── src/components/          # shared UI primitives
│   ├── src/features/            # blackbox feature modules
│   ├── src/lib/                 # api client, config, utilities
│   ├── src/services/            # service contracts and adapters
│   └── src/types/               # shared frontend types
├── docs/
└── docker-compose*.yml
```

## Blackbox Modules

Each feature module owns its internal UI and only communicates through typed
service interfaces and shared app state.

### App Shell

Responsibility:

- global layout
- workspace navigation
- role/persona selector in local dev
- backend status indicator
- user/session surface

Inputs:

- `Persona`
- `WorkspaceDefinition[]`
- `BackendHealth`

Outputs:

- selected workspace
- selected local persona

### Agent Builder

Responsibility:

- list agents
- create agent
- edit agent
- delete agent
- show supported backend payload subset

Service dependency:

- `AgentService`

Blackbox rule:

- UI components should not know Redis keys, Bolna internals, or raw fetch
  details.

### Executive Dashboard

Responsibility:

- summary metrics
- executive risk and outcome view
- backend status and recent activity

Service dependency:

- `ExecutiveMetricsService`

MVP adapter:

- mock data plus real backend health.

### Live Cockpit

Responsibility:

- active call list
- transcript preview
- sentiment/escalation state
- handoff action placeholders

Service dependency:

- `LiveCallService`

MVP adapter:

- mock data.

### CRM Call Desk

Responsibility:

- customer/contact context
- call history
- AI summary
- next actions

Service dependency:

- `ContactService`

MVP adapter:

- mock data.

### Campaign Control

Responsibility:

- campaign list
- campaign details
- audience/script/agent preview
- pacing/compliance scaffold

Service dependency:

- `CampaignService`

MVP adapter:

- mock data; no dialing side effects.

## Service Interfaces

### `HealthService`

```ts
type BackendHealth =
  | { state: "connected"; checks: string[] }
  | { state: "degraded"; failures: Record<string, string> }
  | { state: "unavailable"; message: string };

interface HealthService {
  getHealth(): Promise<{ status: string }>;
  getReadiness(): Promise<BackendHealth>;
}
```

### `AgentService`

```ts
interface AgentSummary {
  id: string;
  name: string;
  status: "draft" | "ready" | "error" | "unknown";
  provider: string;
  model: string;
  updatedAt?: string;
}

interface AgentDraft {
  name: string;
  welcomeMessage: string;
  systemPrompt: string;
  provider: string;
  model: string;
  voiceProvider?: string;
  transcriberProvider?: string;
}

interface AgentService {
  listAgents(): Promise<AgentSummary[]>;
  getAgent(id: string): Promise<AgentDraft>;
  createAgent(draft: AgentDraft): Promise<{ id: string }>;
  updateAgent(id: string, draft: AgentDraft): Promise<void>;
  deleteAgent(id: string): Promise<void>;
}
```

### Mock Service Rule

Every mock service must:

- live behind the same interface as future real services
- clearly mark destructive actions as disabled or local-only
- avoid hidden global state except explicit in-memory demo state

## API Client

The API client should centralize:

- base URL resolution
- JSON parsing
- error normalization
- credentials/cookie inclusion
- timeout handling

Production:

- base URL should be relative: `/bx-caller/api` from browser route context or
  `/api` through Next rewrites.
- requests use browser cookies.

Local dev:

- frontend runs on its own dev server.
- Next rewrites proxy `/api/*` to the backend.
- backend may run with `DEV_BYPASS_AUTH=1`.

## Agent Payload Mapping

The backend expects Bolna-compatible payloads. The MVP frontend must map the
narrow `AgentDraft` form into a valid create/update payload.

Initial supported payload:

- one `conversation` task
- Twilio-compatible input/output defaults
- Deepgram transcriber default
- OpenAI LLM default
- ElevenLabs synthesizer default
- one `task_1.system_prompt`

The mapper should be isolated:

```text
AgentDraft -> BolnaCreateAgentPayload
BolnaAgentPayload -> AgentDraft / AgentSummary
```

## Routing

Suggested routes:

```text
/                      -> redirect to role default workspace
/executive             -> Executive Command Center
/agents                -> Agent Builder Studio
/live                  -> Live Support Cockpit
/desk                  -> CRM Call Desk
/campaigns             -> Outbound Campaign Control
/settings              -> Settings scaffold
```

Production path includes Next `basePath = "/bx-caller"`.

## Testing Strategy

Unit tests:

- agent payload mapper
- API error normalization
- service adapters
- role-to-workspace routing

Component tests:

- agent list loading/error/empty states
- create/edit/delete forms
- health status panel
- campaign mock action disabled state

End-to-end smoke tests:

- app loads locally
- persona switch changes default workspace
- agent CRUD happy path against mocked service or dev backend

## Accessibility

- keyboard-visible focus states
- semantic nav/main/section structure
- form labels and errors
- contrast-safe status colors
- no information conveyed by color alone

## Deployment

Root production compose should eventually include:

- `api` on `127.0.0.1:8102`
- `web` on `127.0.0.1:3102`

Host nginx should route:

- `/bx-caller/api/*` to API, stripping `/bx-caller`
- `/bx-caller/chat/*` to API WebSocket, stripping `/bx-caller`
- `/bx-caller/*` to frontend, preserving `/bx-caller` for Next basePath

