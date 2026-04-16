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
