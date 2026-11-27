# @schema-engine/actions

## 0.5.2

### Patch Changes

- [#415](https://github.com/schema-engine/schema-engine/pull/415) [`02f21c9`](https://github.com/schema-engine/schema-engine/commit/02f21c9ddc51e0b1d7712854707580f5b4e895d0) Thanks [@andeeplus](https://github.com/andeeplus)! - `parseActions` checks each entry with `safeParseNode` from `@schema-engine/registry`, so a workflow entry reports the same issues, at the same places, as any other node:

    - An unregistered `$type` is `No registration for $type '<type>'. Register it in the action registry.` at `$type` (it was `Unknown action type '<type>'. Register it in the action registry.`).
    - An entry that is an object without a string `$type` is `Expected a string $type.` at `$type` (it was `Invalid action configuration: missing $type.`).
    - An entry that is not an object, such as `null` or a string, is `Expected an object with a string $type.` at the entry itself, for example `[1]` (it was at `[1, '$type']`).

    `parseActions` takes `options.hint`, a string that replaces `Register it in the action registry.` at the end of that message, for a domain that registers actions through its own entry point.

    The other issues, their paths and the parsed result are unchanged.

- Updated dependencies [[`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0)]:
    - @schema-engine/registry@0.5.2

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39)]:
    - @schema-engine/registry@0.5.1
