import type React from 'react';
import { FormEngineBuilder } from '@json-form-engine/core/builder';
import type { ElementRegistration, LayoutRegistration, StepperRegistration } from '@json-form-engine/core/types';

/**
 * Create a new FormEngineBuilder instance for React
 * This is the new recommended way to configure form components
 */
export function createReactFormEngine(): FormEngineBuilder {
	return new FormEngineBuilder();
}

/**
 * Type helper for creating React element registrations
 */
export type ReactElementRegistration<TConfig = any> = Omit<ElementRegistration<TConfig>, 'render'> & {
	/** React component for rendering the element */
	component: React.ComponentType<any>;
};

/**
 * Type helper for creating React layout registrations
 */
export type ReactLayoutRegistration<TConfig = any> = Omit<LayoutRegistration<TConfig>, 'render'> & {
	/** React component for rendering the layout */
	component: React.ComponentType<any>;
};

/**
 * Type helper for creating React stepper registrations
 */
export type ReactStepperRegistration<TConfig = any> = Omit<StepperRegistration<TConfig>, 'render'> & {
	/** React component for rendering the stepper */
	component: React.ComponentType<any>;
};

/**
 * Convert React element registration to builder format
 * The render function returns the React component (not rendered)
 */
export function toElementRegistration<TConfig = any>(
	reactReg: ReactElementRegistration<TConfig>,
): ElementRegistration<TConfig> {
	return {
		...reactReg,
		render: reactReg.component as any,
	};
}

/**
 * Convert React layout registration to builder format
 */
export function toLayoutRegistration<TConfig = any>(
	reactReg: ReactLayoutRegistration<TConfig>,
): LayoutRegistration<TConfig> {
	return {
		...reactReg,
		render: reactReg.component as any,
	};
}

/**
 * Convert React stepper registration to builder format
 */
export function toStepperRegistration<TConfig = any>(
	reactReg: ReactStepperRegistration<TConfig>,
): StepperRegistration<TConfig> {
	return {
		...reactReg,
		render: reactReg.component as any,
	};
}
