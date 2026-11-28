import { GRID_ITEM_CLASS, GRID_SUBGRID_CLASS, elementIsSubgrid, getAppearanceAttributes } from '@schema-engine/layout';
import { FormElements } from '@/components/internals/form-elements.js';
import { mergeFieldGridHost } from '@/hooks/grid-styles.js';
import { ChildGrid } from '@/components/internals/child-grid.js';
import { resolveFormEngine } from '@/contexts/resolve-form-engine.js';
import type { FieldSetProps } from './form-fieldset.types.js';
import { objectFieldScope } from '@schema-engine/forms';
import { withContainerState } from '@/lib/field-rules.js';
import './form-fieldset.css';

/**
 * The element's identity as one id token, the same on the server and the client.
 *
 * @remarks
 * `aria-labelledby` is a list of ids split at whitespace, so a name such as `Mailing address` would point at two
 * ids that do not exist. Every character outside `[A-Za-z0-9-]`, `_` included, becomes `_<code point in hex>_`, so
 * the result has no whitespace and two different names never give the same token. It is derived from the
 * element alone, never random, so server markup and hydration agree. A subgrid fieldset's legend id is built
 * from it.
 */
function idToken(identity: string): string {
	return identity.replace(/[^A-Za-z0-9-]/gu, (character) => `_${character.codePointAt(0)?.toString(16)}_`);
}

/**
 * @remarks
 * A disabled fieldset, authored or by a constraint, renders its children
 * disabled. A fieldset with a matching `require` constraint, or inside one,
 * renders them with their required marker. Both are what the constraint hosts
 * compose for the children afterwards, and each `se-field` then applies the live rule. A
 * fieldset whose only required source is its own required rule passes nothing
 * down, because no constraint host governs a field without a constraint wrapper
 * around it. Arrays pass both to their rows the same way.
 *
 * With `grid.subgrid` it renders a `div` with `role="group"` and `aria-labelledby` its legend instead of a
 * `<fieldset>`: Chromium lays a fieldset's content out in an anonymous box that is not a grid item, so it cannot
 * be a subgrid. `display: contents` on a fieldset was rejected because engines expose its semantics
 * inconsistently; a role on a real box reads the same everywhere. Nothing relies on the native `disabled`, since
 * the state above goes to the children. The legend id comes from {@link idToken}. The group keeps the fieldset's
 * border and padding, so the legend is a heading row rather than a gap in the border, and the first and last
 * columns are inset by them. Without `grid.subgrid` it stays a native `<fieldset>`.
 */
export function FormFieldSet(config: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const fieldHost = mergeFieldGridHost(config.grid, config.style);
	const elements = withContainerState(config, config.elements);
	const fields = (
		<FormElements
			elements={elements}
			engine={resolveFormEngine()}
			namePrefix={scope.namePrefix}
			instanceId={scope.instanceId}
		/>
	);
	const description = config.description ? <p class="se-fieldset__description">{config.description}</p> : null;

	if (elementIsSubgrid(config)) {
		const legendId = `${idToken(config.id ?? config.name)}-legend`;
		return (
			<div
				classes={['se-form-field', GRID_ITEM_CLASS, GRID_SUBGRID_CLASS, 'se-fieldset', config.className]}
				// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Chromium cannot make a fieldset a subgrid, see remarks
				role="group"
				aria-labelledby={config.legend ? legendId : undefined}
				data-se-theme={fieldHost.themeId}
				style={fieldHost.style}
				{...getAppearanceAttributes(config.appearance)}
			>
				{config.legend ? (
					<div class="se-fieldset__legend" id={legendId}>
						{config.legend}
					</div>
				) : null}
				{description}
				<ChildGrid subgrid class="se-fieldset__fields">
					{fields}
				</ChildGrid>
			</div>
		);
	}

	return (
		<fieldset
			classes={['se-form-field', GRID_ITEM_CLASS, 'se-fieldset', config.className]}
			data-se-theme={fieldHost.themeId}
			style={fieldHost.style}
			{...getAppearanceAttributes(config.appearance)}
		>
			{config.legend ? <legend class="se-fieldset__legend">{config.legend}</legend> : null}
			{description}
			<ChildGrid elements={config.elements} class="se-fieldset__fields">
				{fields}
			</ChildGrid>
		</fieldset>
	);
}
