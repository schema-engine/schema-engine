import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { parseStandardSchema } from '@schema-engine/forms/lib/standard-schema';
import { formEngineContext, type FormEngineContextValue } from '../provider';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { evaluateConstraintLogic } from '@/hooks/constraint-logic';
import { ElementError } from './element-error';

export interface FormElementProps {
	config: FormEngine.ElementConfig;
	className?: string;
	style?: Record<string, string | number | undefined>;
}

export function renderRegisteredElement(
	config: FormEngine.ElementConfig,
	engine: CoreFormEngine,
	configValidated = false,
): JsxRenderable {
	const { shouldShow, shouldDisable, isRequired } = evaluateConstraintLogic(
		'constraints' in config ? config.constraints : undefined,
		isFieldRequired('rules' in config ? config.rules : undefined),
	);

	if (!shouldShow) {
		return null;
	}

	const { $type } = config;
	const elementRegistration = engine.getElement($type);

	if (!elementRegistration) {
		return (
			<ElementError
				title="Component not found"
				message={`The component type "${$type}" is not registered in the form engine.`}
				componentType={$type}
			/>
		);
	}

	let parsedConfig: FormEngine.ElementConfig = config;
	if (!configValidated) {
		try {
			parsedConfig = parseStandardSchema(elementRegistration.schema, config);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Invalid configuration';
			return <ElementError title="Invalid element configuration" message={errorMessage} componentType={$type} />;
		}
	}

	const { $type: _type, ...componentConfig } = parsedConfig;

	const enhancedConfig = {
		...componentConfig,
		disabled: ('disabled' in config ? config.disabled : false) || shouldDisable,
		required: isRequired,
	};

	return elementRegistration.render(enhancedConfig) as JsxRenderable;
}

@customElement('se-form-element')
export class FormElementHost extends RadiantElement {
	@prop({ type: Object }) config!: FormEngine.ElementConfig;

	@contextSelector({ context: formEngineContext })
	engineContext!: FormEngineContextValue;

	@contextSelector({ context: formInstanceContext })
	instanceContext?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const config = this.config;
		const engine = this.engineContext?.engine;

		if (!config || !engine) {
			return null;
		}

		return renderRegisteredElement(config, engine, this.instanceContext?.configValidated ?? false);
	}
}

export function FormElement({ config, className, style }: FormElementProps): JsxRenderable {
	return jsx('se-form-element', {
		'prop:config': config,
		class: className,
		style,
	});
}
