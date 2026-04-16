# wire-ipc-claude-code

Wire IPC — outbound Ed25519-signed messaging between agents via the Wire message broker.

## Prerequisites

- Wire server running (default: `localhost:9800`)
- Agent identity (Ed25519 keypair)
- Bun (https://bun.sh)

## Install

```
/plugin install agiterra/wire-ipc-claude-code
```

## Tools / Skills

**MCP tools:**
- `send_message` — send a signed message to another agent or channel via Wire
- `register_agent` — sponsor-register a new Wire agent; returns identity + private key ready to pass into `crew.agent_launch` env

## Configuration

| Var | Default | Description |
|-----|---------|-------------|
| `WIRE_URL` | `http://localhost:9800` | Wire server base URL |
| `AGENT_ID` | — | Sender identity (required) |
| `AGENT_PRIVATE_KEY` | — | Ed25519 private key for signing (required) |

## Payload convention

`send_message` accepts a free-form `payload` of any JSON shape — Wire stores and routes it verbatim. To keep agents interoperable, follow the shared `ipc` payload convention unless you have a specific reason not to:

```json
{
  "from": "<sender agent id>",
  "kind": "<one of: ack | task-request | wrap-up | wishlist | status | question | note>",
  "text": "<human-readable message body>"
}
```

- **`from`** — sender's `AGENT_ID`. Redundant with the signed envelope's `iss`, but convenient for recipients that want to peek at `payload` without cracking the envelope.
- **`kind`** — a short tag that lets recipients route or batch messages (e.g. ignore `ack` noise when scanning for `task-request`). Keep it lowercase and hyphenated.
- **`text`** — the message body as a plain string. Markdown is fine. Multi-paragraph is fine. No length cap beyond good manners.

Additional fields are allowed for specialized payloads (e.g. `kind: "wrap-up"` often carries `ticket`, `pr`, `checklist`). Keep them snake_case or kebab-case for consistency.

**Minimal send:**

```ts
await send_message({
  topic: "ipc",
  dest: "brioche",
  payload: { from: "fondant", kind: "ack", text: "seq 3165 received, no action needed." },
});
```

**Broadcast:** omit `dest`. All Wire subscribers on `topic` receive it.

The dashboard shows `payload.text` as the single-line summary — if your payload omits `text`, the dashboard falls back to `detail` → `message` → JSON-stringified payload. Including `text` is strongly preferred so the operator can scan the log at a glance.

## Sponsor-registering new agents

Orchestrators (ED-tier agents, spawn helpers) call `register_agent` to bring a new Wire agent online without hand-writing the JWT-sign-and-POST dance. The tool generates an Ed25519 keypair, signs the registration with the caller's `AGENT_PRIVATE_KEY` (sponsor flow), and returns the new agent's identity + private key.

```ts
const { agent_id, display_name, private_key_b64 } = await register_agent({
  id: "danish",
  // display_name optional — defaults to TitleCase(id)
});

// Feed directly into crew agent_launch:
await agent_launch({
  env: {
    AGENT_ID: agent_id,
    AGENT_NAME: display_name,
    AGENT_PRIVATE_KEY: private_key_b64,
    // …any other env the spawned agent needs (KNOWLEDGE_ENRICH_RULES, etc.)
  },
  project_dir: "/path/to/worktree",
  prompt: "Run the ENG-3021 audit.",
});
```

**Key handling:** the private key is returned as a string in the MCP response. It never touches disk. The orchestrator passes it through crew's `env` map into the spawned agent's process; from there the wire adapter reads it at startup and uses it for signing. Do not persist the returned `private_key_b64` anywhere other than the `agent_launch` env argument.

**Who can sponsor:** whoever is running this MCP server, identified by `AGENT_ID`. The Wire server accepts the registration because the JWT is signed by an already-registered agent. There is no separate "sponsor" role — registration privilege is transitive: any registered agent can sponsor new agents.
