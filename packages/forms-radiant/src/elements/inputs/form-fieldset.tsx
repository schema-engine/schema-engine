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
 * A fieldset with `grid.subgrid` is a `div` that carries the border and padding and holds a `fieldset` that
 * draws none, because a `<fieldset>` cannot be a subgrid: the browser lays its content out in an anonymous box
 * that is not an item of the grid around it. The stylesheet makes that inner `fieldset` `display: contents`, so
 * the legend is no longer drawn on the border.
 */
export function FormFieldSet(config: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const fieldHost = mergeFieldGridHost(config.grid, config.style);
	const elements = withContainerState(config, config.elements);
	const subgrid = elementIsSubgrid(config);

	const content = (
		<>
			{config.legend ? <legend class="se-fieldset__legend">{config.legend}</legend> : null}
			{config.description ? <p class="se-fieldset__description">{config.description}</p> : null}
			<ChildGrid elements={config.elements} subgrid={subgrid} class="se-fieldset__fields">
				<FormElements
					elements={elements}
					engine={resolveFormEngine()}
					namePrefix={scope.namePrefix}
					instanceId={scope.instanceId}
				/>
			</ChildGrid>
		</>
	);

	if (subgrid) {
		return (
			<div
				classes={['se-form-field', GRID_ITEM_CLASS, GRID_SUBGRID_CLASS, 'se-fieldset', config.className]}
				data-se-theme={fieldHost.themeId}
				style={fieldHost.style}
				{...getAppearanceAttributes(config.appearance)}
			>
				<fieldset classes={[GRID_SUBGRID_CLASS]} data-se-theme={fieldHost.themeId}>
					{content}
				</fieldset>
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
			{content}
		</fieldset>
	);
}
