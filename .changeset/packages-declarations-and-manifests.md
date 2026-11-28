---
'@schema-engine/registry': patch
'@schema-engine/actions': patch
'@schema-engine/layout': patch
'@schema-engine/forms': patch
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
---

The published packages resolve under `node16` and `nodenext` module resolution, and declare what they are.

- The declaration files write their relative imports with an extension (`./types.js`), so a consumer on `node16` or `nodenext` finds the exports of `@schema-engine/actions`, `forms`, `forms-react`, `layout` and `forms-radiant`, where the entry resolved to no exports. `@schema-engine/forms-radiant` no longer writes `export * from './recipes/index.d.ts'`, which was an error (TS2846) for a project with `skipLibCheck: false`.
- `@schema-engine/actions` has an `exports` map (`.` and `./package.json`), as the other packages do, and `@schema-engine/registry` exports `./package.json`.
- No package declares an `engines` field.
- `@schema-engine/forms-radiant` no longer lists `@schema-engine/actions` as a dependency, which nothing imported.
