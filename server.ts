#!/usr/bin/env bun
import { startServer } from "@agiterra/wire-ipc-tools";

startServer().catch((e) => {
  console.error("[wire-ipc] fatal:", e);
  process.exit(1);
});
