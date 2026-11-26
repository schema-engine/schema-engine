import { GRID_ITEM_CLASS, GRID_SUBGRID_CLASS, elementIsSubgrid, getAppearanceAttributes } from '@schema-engine/layout';
import { FormElements } from '@/components/internals/form-elements';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { ChildGrid } from '@/components/internals/child-grid';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import type { FieldSetProps } from './form-fieldset.types';
import { objectFieldScope } from '@schema-engine/forms';
import { withContainerState } from '@/lib/field-rules';
import './form-fieldset.css';

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
 * A fieldset with `grid.subgrid` is a `div` with `role="group"`, labelled by its legend text, because Chromium
 * cannot make a `<fieldset>` a subgrid: it lays the fieldset's content out in an anonymous box that does not take
 * the parent's tracks. The group keeps the fieldset's border and padding, so its legend is a heading row at the
 * top instead of a gap in the border, and the first and last columns are inset by that border and padding.
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
		const legendId = `${config.id ?? config.name}-legend`;
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
