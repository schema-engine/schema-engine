import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig, FormStep } from '@schema-engine/forms/schemas';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { getFormGridStyles } from '@/hooks/grid-styles';
import { renderRegisteredElement } from './field-renderer';

export function renderStepFields(step: FormStep, config: FormConfig, engine?: CoreFormEngine): JsxRenderable {
	if (!step.elements.length) return null;
	return (
		<div class="se-form-elements" style={getFormGridStyles(config.grid)}>
			{step.elements.map((field) => (engine ? renderRegisteredElement(field, engine) : null))}
		</div>
	);
}
