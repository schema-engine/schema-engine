# @schema-engine/actions

## 0.5.2

### Patch Changes

- [#415](https://github.com/schema-engine/schema-engine/pull/415) [`02f21c9`](https://github.com/schema-engine/schema-engine/commit/02f21c9ddc51e0b1d7712854707580f5b4e895d0) Thanks [@andeeplus](https://github.com/andeeplus)! - `parseActions` checks each entry with `safeParseNode` from `@schema-engine/registry`, so a workflow entry reports the same issues, at the same places, as any other node:

    - An unregistered `$type` is `No registration for $type '<type>'. Register it in the action registry.` at `$type` (it was `Unknown action type '<type>'. Register it in the action registry.`).
    - An entry that is an object without a string `$type` is `Expected a string $type.` at `$type` (it was `Invalid action configuration: missing $type.`).
    - An entry that is not an object, such as `null` or a string, is `Expected an object with a string $type.` at the entry itself, for example `[1]` (it was at `[1, '$type']`).

    `parseActions` takes `options.hint`, a string that replaces `Register it in the action registry.` at the end of that message, for a domain that registers actions through its own entry point.

    The other issues, their paths and the parsed result are unchanged.

- Updated dependencies [[`67e2556`](https://github.com/schema-engine/schema-engine/commit/67e25562959cc0242a56a59ec8d982f6e21fc93b), [`bdff897`](https://github.com/schema-engine/schema-engine/commit/bdff897952056ea0a4033e014692f5afc78c96d0), [`40a3d6f`](https://github.com/schema-engine/schema-engine/commit/40a3d6f8f111ebcd00cad0e72d056d5aa3710488), [`a719ba4`](https://github.com/schema-engine/schema-engine/commit/a719ba4e773cd3223bb7e4e6723e82a1006d1874), [`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0), [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75)]:
    - @schema-engine/registry@0.5.2

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39)]:
    - @schema-engine/registry@0.5.1
