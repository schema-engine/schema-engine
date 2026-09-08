import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { NormalizedElementConfig } from '@schema-engine/forms';
import { formEngineContext, type FormEngineContextValue } from '../provider';
import { renderRegisteredElement } from './render-registered-element';

export interface FormElementProps {
	/**
	 * Element from a normalized form or `engine.validateElement`.
	 * This host does not re-parse registration schemas.
	 */
	config: NormalizedElementConfig;
	name?: string;
	id?: string;
	instanceId?: string;
	className?: string;
	style?: Record<string, string | number | undefined>;
}

export { renderRegisteredElement } from './render-registered-element';

@customElement('se-form-element')
export class FormElementHost extends RadiantElement {
	@prop({ type: Object }) config!: NormalizedElementConfig;
	@prop({ type: String }) name?: string;
	@prop({ type: String }) fieldId?: string;
	@prop({ type: String }) instanceId?: string;

	@contextSelector({ context: formEngineContext })
	engineContext!: FormEngineContextValue;

	override render(): JsxRenderable {
		const config = this.config;
		const engine = this.engineContext?.engine;

		if (!config || !engine) {
			return null;
		}

		return renderRegisteredElement(config, engine, {
			name: this.name,
			id: this.fieldId,
			instanceId: this.instanceId,
		});
	}
}

export function FormElement({ config, name, id, instanceId, className, style }: FormElementProps): JsxRenderable {
	return jsx('se-form-element', {
		'prop:config': config,
		'prop:name': name,
		'prop:fieldId': id,
		'prop:instanceId': instanceId,
		class: className,
		style,
	});
}
