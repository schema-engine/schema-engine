import { FormElements } from '@/components/internals/form-elements';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import type { FieldSetProps } from './form-fieldset.types';
import { objectFieldScope } from '@schema-engine/forms';
import './form-fieldset.css';

/**
 * @remarks
 * A disabled fieldset, authored or by a constraint, renders its children
 * disabled, which is what live constraint sync composes for them afterwards.
 */
export function FormFieldSet(config: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const fieldHost = mergeFieldGridHost(config.grid, config.style);
	const elements = config.disabled
		? config.elements.map((element) => ({ ...element, disabled: true }))
		: config.elements;

	return (
		<fieldset class="se-form-field se-fieldset" data-se-grid-theme={fieldHost.themeId} style={fieldHost.style}>
			{config.legend ? <legend class="se-fieldset__legend">{config.legend}</legend> : null}
			{config.description ? <p class="se-fieldset__description">{config.description}</p> : null}
			<div class="se-fieldset__fields">
				<FormElements
					elements={elements}
					engine={resolveFormEngine()}
					namePrefix={scope.namePrefix}
					instanceId={scope.instanceId}
				/>
			</div>
		</fieldset>
	);
}
