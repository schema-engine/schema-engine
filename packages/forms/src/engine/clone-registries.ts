import type { FormActionTrigger } from '@/actions';
import { ElementRegistry, LayoutRegistry, StepperRegistry } from '@/registries';
import type {
	BuilderActionBaseContext,
	BuilderActionRegistration,
	InputRegistration,
	LayoutRegistration,
	StaticRegistration,
	StepperRegistration,
} from '@/types';
import { ActionRegistry } from '@schema-engine/actions';

export interface CloneEngineRegistriesSource {
	elements: Iterable<InputRegistration<any, any, any> | StaticRegistration<any, any, any>>;
	layouts: Iterable<LayoutRegistration<any, any, any>>;
	steppers: Iterable<StepperRegistration<any, any, any>>;
	actions: Iterable<BuilderActionRegistration>;
}

export interface ClonedEngineRegistries {
	elementRegistry: ElementRegistry;
	layoutRegistry: LayoutRegistry;
	stepperRegistry: StepperRegistry;
	actionRegistry: ActionRegistry<BuilderActionBaseContext, FormActionTrigger>;
}

/**
 * Clone engine registries into fresh registry instances with the same registrations.
 */
export function cloneEngineRegistries(source: CloneEngineRegistriesSource): ClonedEngineRegistries {
	const elementRegistry = new ElementRegistry();
	const layoutRegistry = new LayoutRegistry();
	const stepperRegistry = new StepperRegistry();
	const actionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>();

	for (const item of source.elements) {
		elementRegistry.register(item);
	}
	for (const item of source.layouts) {
		layoutRegistry.register(item);
	}
	for (const item of source.steppers) {
		stepperRegistry.register(item);
	}
	for (const item of source.actions) {
		actionRegistry.register(item);
	}

	return { elementRegistry, layoutRegistry, stepperRegistry, actionRegistry };
}
