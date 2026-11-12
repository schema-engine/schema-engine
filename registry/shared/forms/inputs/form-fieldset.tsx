import type React from 'react';
import { FormElements } from '@schema-engine/forms-react/primitives';
import { objectFieldScope } from '@schema-engine/forms';
import { getFieldGridVariables } from '@schema-engine/forms/lib/grid-styles';
import { useChildGridProps, useGridThemeId } from '@schema-engine/forms-react/hooks';
import { FieldSet } from '@/components/ui/schema-engine/components/field';
import type { FieldSetProps } from './form-fieldset.types';

/**
 * Groups related form fields into a nested object.
 *
 * Field paths are composed at render time: children bind as `${name}.${child.name}`.
 */
export function FormFieldSet({ ...config }: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const gridThemeId = useGridThemeId();
	const childGrid = useChildGridProps(config.elements);
	const style: React.CSSProperties = { ...getFieldGridVariables(config.grid), ...config.style };

	return (
		<div className="se-form-field space-y-4" data-se-grid-theme={gridThemeId} style={style}>
			<FieldSet legend={config.legend} description={config.description}>
				<div {...childGrid}>
					<FormElements
						elements={config.elements}
						namePrefix={scope.namePrefix}
						instanceId={scope.instanceId}
					/>
				</div>
			</FieldSet>
		</div>
	);
}
