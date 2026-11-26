---
'@schema-engine/actions': patch
---

`parseActions` checks each entry with `safeParseNode` from `@schema-engine/registry`, so a workflow entry reports the same issues, at the same places, as any other node:

- An unregistered `$type` is `No registration for $type '<type>'. Register it in the action registry.` at `$type` (it was `Unknown action type '<type>'. Register it in the action registry.`).
- An entry that is an object without a string `$type` is `Expected a string $type.` at `$type` (it was `Invalid action configuration: missing $type.`).
- An entry that is not an object, such as `null` or a string, is `Expected an object with a string $type.` at the entry itself, for example `[1]` (it was at `[1, '$type']`).

`parseActions` takes `options.hint`, a string that replaces `Register it in the action registry.` at the end of that message, for a domain that registers actions through its own entry point.

The other issues, their paths and the parsed result are unchanged.
