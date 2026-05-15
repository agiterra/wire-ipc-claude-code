# wire-ipc

> Outbound Ed25519-signed messaging between agents via The Wire. The IPC layer of the Agiterra Multi-Agent Toolkit.

Part of the [Agiterra Multi-Agent Toolkit](https://github.com/agiterra/handbook). Pairs with the [`wire`](https://github.com/agiterra/wire-claude-code) plugin (which handles inbound + agent registration).

## What this gets you

- **Your agent can talk to other agents** via signed messages routed through Wire
- **Unicast or broadcast** — `dest` for one recipient, omit it for everyone on a topic
- **Forge-proof identity** — every message is signed by the sender's Ed25519 key; Wire validates on receive
- **Conventions for interoperability** — the shared `ipc` payload schema lets agents from different vendors and codebases understand each other

## Quick setup

```
/plugin marketplace add agiterra/claude-marketplace   # one-time
/plugin install wire-ipc@agiterra
```

You'll also want [`wire`](https://github.com/agiterra/wire-claude-code) installed (it handles inbound delivery + identity registration). Most agents install both.

## For the agent

Tools exposed:

| Tool | What it does |
|---|---|
| `send_message` | Send a signed message to another agent (unicast via `dest`) or broadcast (omit `dest`) |

> **Note:** `register_agent` moved to the [`wire`](https://github.com/agiterra/wire-claude-code) plugin in v1.3.0. Use `mcp__plugin_wire_wire__register_agent` for new agent registration.

## Reference

| Var | Default | Description |
|-----|---------|-------------|
| `WIRE_URL` | `http://localhost:9800` | Wire server base URL |
| `AGENT_ID` | (required) | Sender identity |
| `AGENT_PRIVATE_KEY` | (required) | Ed25519 private key for signing |

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

`register_agent` moved to the [`wire`](https://github.com/agiterra/wire-claude-code) plugin in v1.3.0 (the registration concern belongs to wire-tools, not the IPC channel). See the wire plugin README for the sponsor-flow walkthrough.
