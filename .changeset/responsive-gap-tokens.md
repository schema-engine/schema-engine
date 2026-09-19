---
'@schema-engine/forms': minor
---

Let engine gap tokens change by breakpoint, so one token carries a whole responsive rhythm.

```ts
createFormEngine({
	grid: {
		gap: { default: '1rem', loose: '1.5rem' },
		responsive: {
			md: { default: '1.25rem' },
			lg: { default: '1.5rem', loose: '2rem' },
		},
	},
});
```

A form that writes `gap: 'default'` now inherits that rhythm with no `responsive` entry of its own. Previously the only way to vary spacing by width was for each form to restate it, which put a piece of the design system's vocabulary into form config.

`responsive` is breakpoint-major, matching a form's own `responsive`: each entry lists the tokens that change at that width, and unlisted tokens keep the value from the next narrower one. Base values stay in `gap`, which is unchanged. Tokens remain axis-agnostic — a form chooses which token each axis uses through `gapX`/`gapY`.

Ramps are emitted as redeclarations of the token's base custom property inside the media queries the theme already generates, so nothing changes for renderers, for `getFormGridVariables`, or for a host overriding the public `--se-grid-gap-*` token at `:root` — that override still replaces the token at every width, ramp included. `NormalizedGridTheme` gains a `responsive` field; `gap` keeps its shape. A theme without `responsive` emits byte-identical CSS to before.
