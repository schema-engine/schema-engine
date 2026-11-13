import { GRID_CLASS, GRID_ITEM_CLASS, getAppearanceAttributes } from '@schema-engine/layout';
import { FormElements } from '@/components/internals/form-elements';
import { mergeChildrenGridHost, mergeFieldGridHost } from '@/hooks/grid-styles';
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
 */
export function FormFieldSet(config: FieldSetProps) {
	const scope = objectFieldScope(config.name, config);
	const fieldHost = mergeFieldGridHost(config.grid, config.style);
	const elements = withContainerState(config, config.elements);
	const childrenHost = mergeChildrenGridHost(config.elements);

	return (
		<fieldset
			classes={['se-form-field', GRID_ITEM_CLASS, 'se-fieldset', config.className]}
			data-se-theme={fieldHost.themeId}
			style={fieldHost.style}
			{...getAppearanceAttributes(config.appearance)}
		>
			{config.legend ? <legend class="se-fieldset__legend">{config.legend}</legend> : null}
			{config.description ? <p class="se-fieldset__description">{config.description}</p> : null}
			<div
				class={`se-fieldset__fields se-form-grid ${GRID_CLASS}`}
				data-se-theme={childrenHost.themeId}
				style={childrenHost.style}
			>
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
