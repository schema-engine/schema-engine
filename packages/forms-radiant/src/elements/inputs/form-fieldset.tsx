import { FormElements } from '@/components/internals/form-elements';
import { mergeFieldGridHost, owningFormEngine } from '@/hooks/grid-styles';
import type { FieldSetProps } from '@/registry/forms/inputs/form-fieldset.types';
import { objectFieldScope } from '@schema-engine/forms';
import './form-fieldset.css';

export function FormFieldSet(config: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const fieldHost = mergeFieldGridHost(config.grid, config.style);

	return (
		<fieldset class="se-form-field se-fieldset" data-se-grid-theme={fieldHost.themeId} style={fieldHost.style}>
			{config.legend ? <legend class="se-fieldset__legend">{config.legend}</legend> : null}
			{config.description ? <p class="se-fieldset__description">{config.description}</p> : null}
			<div class="se-fieldset__fields">
				<FormElements
					elements={config.elements}
					engine={owningFormEngine()}
					namePrefix={scope.namePrefix}
					instanceId={scope.instanceId}
				/>
			</div>
		</fieldset>
	);
}
