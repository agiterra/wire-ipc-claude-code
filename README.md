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
