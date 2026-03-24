#!/usr/bin/env bun
/**
 * Exchange IPC plugin for Claude Code.
 *
 * Provides the send_message tool for outbound Ed25519-signed IPC messaging.
 * Registers the IPC webhook validator with the Exchange server on startup.
 *
 * Config env vars:
 *   EXCHANGE_URL            default http://localhost:9800
 *   EXCHANGE_AGENT_ID       required or auto-generated
 *   EXCHANGE_AGENT_NAME     display name (for registration)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadOrCreateKey, type KeyPair } from "@agiterra/exchange-tools";
import {
  IPC_VALIDATOR,
  registerIpcWebhook,
  sendSignedMessage,
} from "@agiterra/exchange-ipc-tools";

const EXCHANGE_URL = process.env.EXCHANGE_URL ?? "http://localhost:9800";
const AGENT_ID =
  process.env.EXCHANGE_AGENT_ID ?? `claude-${crypto.randomUUID().slice(0, 8)}`;
const AGENT_NAME = process.env.EXCHANGE_AGENT_NAME ?? AGENT_ID;

let keyPair: KeyPair | null = null;

// --- MCP server ---

const mcp = new Server(
  { name: "exchange-ipc", version: "0.1.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "This plugin provides IPC messaging via The Exchange. " +
      "Use the send_message tool to send Ed25519-signed messages to other agents. " +
      "Messages are routed through the Exchange message broker.",
  },
);

// --- Tools ---

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "send_message",
      description: "Send an Ed25519-signed IPC message via The Exchange",
      inputSchema: {
        type: "object" as const,
        properties: {
          topic: {
            type: "string",
            description: "Routing topic (e.g. 'ipc', 'ipc.task')",
          },
          payload: {
            description: "Message payload (any JSON value)",
          },
          dest: {
            type: "string",
            description: "Optional unicast destination agent ID",
          },
        },
        required: ["topic", "payload"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "send_message") {
    const { topic, payload, dest } = req.params.arguments as {
      topic: string;
      payload: unknown;
      dest?: string;
    };
    try {
      if (!keyPair) throw new Error("not initialized");
      const { seq } = await sendSignedMessage(
        EXCHANGE_URL,
        AGENT_ID,
        keyPair.privateKey,
        topic,
        payload ?? null,
        dest,
      );
      return {
        content: [{ type: "text" as const, text: `sent seq=${seq}` }],
      };
    } catch (e: any) {
      return {
        content: [
          { type: "text" as const, text: `send failed: ${e.message}` },
        ],
        isError: true,
      };
    }
  }
  throw new Error(`unknown tool: ${req.params.name}`);
});

// --- Main ---

async function main(): Promise<void> {
  keyPair = await loadOrCreateKey(AGENT_ID);

  const transport = new StdioServerTransport();
  await mcp.connect(transport);

  // Register IPC webhook so the Exchange server validates inbound IPC messages
  await registerIpcWebhook(EXCHANGE_URL, AGENT_ID, IPC_VALIDATOR).catch((e) =>
    console.error(`[exchange-ipc] webhook registration failed: ${e}`),
  );

  console.error(`[exchange-ipc] ready (agent=${AGENT_ID})`);
}

main().catch((e) => {
  console.error("[exchange-ipc] fatal:", e);
  process.exit(1);
});
