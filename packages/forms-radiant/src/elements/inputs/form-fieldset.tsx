import { FormElements } from '@/components/internals/form-elements';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import type { FieldSetProps } from './form-fieldset.types';
import { objectFieldScope } from '@schema-engine/forms';
import { isRenderedRequired } from '@/lib/field-rules';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import './form-fieldset.css';

/**
 * @remarks
 * A disabled fieldset, authored or by a constraint, renders its children
 * disabled. A fieldset with a matching `require` constraint, or inside one,
 * renders them with their required marker; constraint sync then applies the
 * live rule. Both are what live constraint sync composes for the children
 * afterwards. A fieldset whose only required source is its own required rule
 * passes nothing down, because sync governs no field without a constraint
 * wrapper around it. Arrays do not pass either state to their rows.
 */
export function FormFieldSet(config: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const fieldHost = mergeFieldGridHost(config.grid, config.style);
	const required =
		isRenderedRequired(config) && (Boolean(config.constraints?.length) || !isFieldRequired(config.rules));
	const elements =
		config.disabled || required
			? config.elements.map((element) => ({
					...element,
					...(config.disabled ? { disabled: true } : {}),
					...(required ? { required: true } : {}),
				}))
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
