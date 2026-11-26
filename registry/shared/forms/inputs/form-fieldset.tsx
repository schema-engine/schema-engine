import type React from 'react';
import { ChildGrid, FormElements } from '@schema-engine/forms-react/primitives';
import { objectFieldScope } from '@schema-engine/forms';
import { GRID_ITEM_CLASS, getAppearanceAttributes, getGridItemVariables } from '@schema-engine/layout';
import { useLayoutThemeId } from '@schema-engine/forms-react/hooks';
import { FieldSet } from '@/components/ui/schema-engine/components/field';
import type { FieldSetProps } from './form-fieldset.types';

/**
 * Groups related form fields into a nested object.
 *
 * Field paths are composed at render time: children bind as `${name}.${child.name}`.
 */
export function FormFieldSet({ ...config }: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const layoutThemeId = useLayoutThemeId();
	const style: React.CSSProperties = { ...getGridItemVariables(config.grid), ...config.style };

	return (
		<div
			className={`se-form-field ${GRID_ITEM_CLASS} space-y-4 ${config.className ?? ''}`.trim()}
			data-se-theme={layoutThemeId}
			style={style}
			{...getAppearanceAttributes(config.appearance)}
		>
			<FieldSet legend={config.legend} description={config.description}>
				<ChildGrid elements={config.elements}>
					<FormElements
						elements={config.elements}
						namePrefix={scope.namePrefix}
						instanceId={scope.instanceId}
					/>
				</ChildGrid>
			</FieldSet>
		</div>
	);
}
