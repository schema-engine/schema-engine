# @schema-engine/registry

## 0.5.2

### Patch Changes

- [#415](https://github.com/schema-engine/schema-engine/pull/415) [`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `safeParseNode(registry, node, path?)`, which checks one node against the registration its `$type` names without throwing. `registry` is anything whose `get(key)` returns a registration with a `schema`. It returns `{ success: true, registration, data }` or `{ success: false, issues }`, and every issue's `path` starts with the `path` you pass, so a walk over a tree reports each issue by its position in the document. A node that is not an object is `Expected an object with a string $type.` at `path`; an object without a string `$type` is `Expected a string $type.` and a `$type` no registration answers is `No registration for $type '<type>'.` followed by a space and the lookup's optional `hint`, a string such as `Register it with defineBadge.`, both at `[...path, '$type']`. `unregisteredTypeMessage(type, hint?)` writes that message, for a caller that has to throw for the same case.

    Add `standardSchema(validate)`, which builds a Standard Schema from a function that returns `{ value }` or `{ issues }`, for a registration whose check is not a schema library's.

    Add `formatIssuePath(path, source?)`, which writes the `path` of an issue as text: keys joined by dots, indexes in brackets (`children[1].label`), and the empty string for a missing or empty path. A segment may be a key or a Standard Schema `{ key }` object. Given the document as `source`, an array item with a string `id` is followed by it: `children[1] (hero).label`.

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.
