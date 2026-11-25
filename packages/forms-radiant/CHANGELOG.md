# @schema-engine/forms-radiant

## 0.5.2

### Patch Changes

- [#408](https://github.com/schema-engine/schema-engine/pull/408) [`1adccc7`](https://github.com/schema-engine/schema-engine/commit/1adccc70f2fe81361510df0723e9149559673ae7) Thanks [@andeeplus](https://github.com/andeeplus)! - Cards, the hero form, fieldsets, array rows, the drop zone and the debugger timeline now round their corners with Radiant UI's `--radius-container` instead of `--radius-control`, so a theme can round controls fully (pill) without turning cards into ellipses. With the default Radiant UI radius pack, containers are slightly rounder (5.6px instead of 4.2px).
- Updated dependencies []:
    - @schema-engine/forms@0.5.2

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.

- [#405](https://github.com/schema-engine/schema-engine/pull/405) [`17652b3`](https://github.com/schema-engine/schema-engine/commit/17652b3db0ee517515da7addb4431f80689a6f31) Thanks [@andeeplus](https://github.com/andeeplus)! - Require `@ecopages/radiant-ui` 0.6.2 or later, which shows the error border on a select or combobox in an invalid field.
- Updated dependencies [[`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39), [`31caacb`](https://github.com/schema-engine/schema-engine/commit/31caacb15911743031a4fd79ba5453a2003d9927), [`174a427`](https://github.com/schema-engine/schema-engine/commit/174a42755c3295a34d3e7a2c35c2be6616158433)]:
    - @schema-engine/actions@0.5.1
    - @schema-engine/layout@0.5.1
    - @schema-engine/forms@0.5.1
