import { useId } from 'react';
import type React from 'react';
import { ChildGrid, FormElements } from '@schema-engine/forms-react/primitives';
import { objectFieldScope } from '@schema-engine/forms';
import {
	GRID_ITEM_CLASS,
	GRID_SUBGRID_CLASS,
	elementIsSubgrid,
	getAppearanceAttributes,
	getGridItemVariables,
} from '@schema-engine/layout';
import { useLayoutThemeId } from '@schema-engine/forms-react/hooks';
import { FieldLegend, FieldSet } from '@/components/ui/schema-engine/components/field';
import type { FieldSetProps } from './form-fieldset.types';

/**
 * Groups related form fields into a nested object.
 *
 * Field paths are composed at render time: children bind as `${name}.${child.name}`.
 *
 * @remarks
 * With `grid.subgrid` the group is the grid item itself, a `div` with `role="group"` labelled by its legend,
 * because Chromium cannot make a `<fieldset>` a CSS subgrid.
 */
export function FormFieldSet({ ...config }: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const layoutThemeId = useLayoutThemeId();
	const legendId = useId();
	const style: React.CSSProperties = { ...getGridItemVariables(config.grid), ...config.style };
	const fields = (
		<FormElements elements={config.elements} namePrefix={scope.namePrefix} instanceId={scope.instanceId} />
	);

	if (elementIsSubgrid(config)) {
		return (
			<div
				className={`se-form-field ${GRID_ITEM_CLASS} ${GRID_SUBGRID_CLASS} ${config.className ?? ''}`.trim()}
				role="group"
				aria-labelledby={config.legend ? legendId : undefined}
				data-se-theme={layoutThemeId}
				style={style}
				{...getAppearanceAttributes(config.appearance)}
			>
				{config.legend && (
					<FieldLegend as="div" id={legendId} description={config.description}>
						{config.legend}
					</FieldLegend>
				)}
				<ChildGrid subgrid>{fields}</ChildGrid>
			</div>
		);
	}

	return (
		<div
			className={`se-form-field ${GRID_ITEM_CLASS} space-y-4 ${config.className ?? ''}`.trim()}
			data-se-theme={layoutThemeId}
			style={style}
			{...getAppearanceAttributes(config.appearance)}
		>
			<FieldSet legend={config.legend} description={config.description}>
				<ChildGrid elements={config.elements}>{fields}</ChildGrid>
			</FieldSet>
		</div>
	);
}
