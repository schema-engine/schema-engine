/** @jsxImportSource react */
import { FormElements } from '@schema-engine/forms-react/primitives';
import { objectFieldScope } from '@schema-engine/forms';
import { FieldSet } from '@/components/ui/schema-engine/components/field';
import type { FieldSetProps } from './form-fieldset.types';

/**
 * Groups related form fields into a nested object.
 *
 * Field paths are composed at render time: children bind as `${name}.${child.name}`.
 */
export function FormFieldSet({ ...config }: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);

	return (
		<div className="space-y-4" style={config.style}>
			<FieldSet legend={config.legend} description={config.description}>
				<div className="space-y-4">
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
