import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { collectParityDiagnostics } from "./lib/spec-parity.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const diagnostics = await collectParityDiagnostics(root);
if (diagnostics.length > 0) {
  for (const diagnostic of diagnostics) process.stderr.write(`${diagnostic}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("spec-interface-vector-parity=ok\n");
}
