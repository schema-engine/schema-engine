import { createContext, useMemo, useCallback, useState, type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionExecutor } from './hooks';
import { generateFormSchema } from './validation';
import { type FormComponentRegistryImpl, defaultFormRegistry } from './registry';
import type { ActionExecutionContext, FormActionConfig } from './actions/index';
import type { FormConfig } from './types/form';

/**
 * Form Engine context value
 */
export interface FormEngineContextValue {
	registry: FormComponentRegistryImpl;
	executeAction?: (action: FormActionConfig) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Form Engine context
 */
export const FormEngineContext = createContext<FormEngineContextValue | null>(null);

/**
 * Form Instance context value - includes action execution
 */
export interface FormInstanceContextValue {
	executeAction: (action: FormActionConfig) => Promise<{ success: boolean; error?: string }>;
	handleFormChange: (data: any) => Promise<void>;
	currentStep: number;
	totalSteps: number;
	goToStep: (step: number) => void;
	goToNext: () => void;
	goToPrevious: () => void;
}

/**
 * Form Instance context
 */
export const FormInstanceContext = createContext<FormInstanceContextValue | null>(null);

/**
 * Props for FormEngineProvider
 */
export interface FormEngineProviderProps {
	children: ReactNode;
	registry?: FormComponentRegistryImpl;
}

/**
 * Provider component for the form engine
 */
export function FormEngineProvider({ children, registry = defaultFormRegistry }: FormEngineProviderProps) {
	const contextValue: FormEngineContextValue = {
		registry,
	};

	return <FormEngineContext.Provider value={contextValue}>{children}</FormEngineContext.Provider>;
}

/**
 * Props for FormProvider wrapper
 */
export interface FormProviderProps {
	config: FormConfig;
	defaultValues?: Record<string, any>;
	children: ReactNode;
	onSubmit?: (data: any) => void | Promise<void>;
	onChange?: (data: any) => void;
	onAction?: (action: FormActionConfig, data: any) => void | Promise<void>;
	onValidationError?: (errors: Record<string, string>) => void;
}

/**
 * Form provider that wraps React Hook Form with Zod validation
 */
export function FormEngineFormProvider({
	config,
	defaultValues = {},
	children,
	onSubmit,
	onChange,
	onAction,
	onValidationError,
}: FormProviderProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const actionExecutor = useActionExecutor();

	const allFields = useMemo(() => {
		return config.steps.flatMap((step) => step.fields || []);
	}, [config.steps]);

	const formDefaultValues = useMemo(() => {
		const fieldDefaults = allFields.reduce(
			(acc, field) => {
				if (field.defaultValue !== undefined) {
					acc[field.name] = field.defaultValue;
				}
				return acc;
			},
			{} as Record<string, any>,
		);

		return { ...fieldDefaults, ...defaultValues };
	}, [allFields, defaultValues]);

	const validationSchema = useMemo(() => {
		if (config.validation) {
			return config.validation;
		}

		if (config.autoGenerateSchema !== false) {
			return generateFormSchema(allFields);
		}

		return undefined;
	}, [config.validation, config.autoGenerateSchema, allFields]);

	const form = useForm({
		resolver: validationSchema ? zodResolver(validationSchema as any) : undefined,
		defaultValues: formDefaultValues,
		mode: config.validationMode || 'onBlur',
		reValidateMode: config.reValidateMode,
	});

	const buildActionContext = useCallback((): ActionExecutionContext => {
		const formData = form.getValues();
		const formState = form.formState;

		return {
			formId: config.id || 'unnamed-form',
			formData,
			currentStep,
			totalSteps: config.steps.length,
			isValid: formState.isValid,
			errors: formState.errors,
			form,
			metadata: {
				stepStartTime: Date.now(),
				totalFormTime: Date.now() - Date.now(),
				userInteractions: formState.submitCount + Object.keys(formState.touchedFields).length,
			},
		};
	}, [form, config.id, config.steps.length, currentStep]);

	/**
	 * Execute an action configuration using the new plugin-based system
	 */
	const executeAction = useCallback(
		async (action: FormActionConfig) => {
			try {
				const context = buildActionContext();
				const results = await actionExecutor.executeTrigger([action], 'form_submit', context);
				const result = results[0] || { success: false, error: 'No result returned' };

				if (result.success) {
					onAction?.(action, form.getValues());
				} else {
					onValidationError?.({ _actionError: result.error || 'Unknown action error' });
				}
				return result;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				onValidationError?.({ _actionError: errorMessage });
				return { success: false, error: errorMessage };
			}
		},
		[buildActionContext, form, onAction, onValidationError, actionExecutor],
	);

	/**
	 * Handle form changes - triggers actions for specific change events
	 */
	const handleFormChange = useCallback(
		async (data: any) => {
			if (config.actions && config.actions.length > 0) {
				try {
					const context = buildActionContext();
					await actionExecutor.executeTrigger(config.actions, 'form_change', context);
				} catch (error) {
					console.error('Form change action execution failed:', error);
				}
			}

			if (onChange) onChange(data);

			if (config.onChange) config.onChange(data);
		},
		[config.actions, config.onChange, onChange, buildActionContext, actionExecutor],
	);

	/**
	 * Handle form submission - supports both legacy callbacks and new action system
	 */
	const handleSubmit = useCallback(
		async (data: any) => {
			if (config.actions && config.actions.length > 0) {
				try {
					const context = buildActionContext();
					const results = await actionExecutor.executeTrigger(config.actions, 'form_submit', context);

					const failedAction = results.find(
						(result: any) => !result.success && result.shouldContinue === false,
					);

					if (failedAction) {
						if (onValidationError) {
							onValidationError({ _actionError: failedAction.error || 'Action execution failed' });
						}
						return;
					}
				} catch (error) {
					console.error('Form action execution failed:', error);
					onValidationError?.({ _actionError: error instanceof Error ? error.message : 'Unknown error' });
					return;
				}
			}

			if (onSubmit) {
				onSubmit(data);
			}
			if (config.onSubmit) {
				config.onSubmit(data);
			}
		},
		[config.actions, config.onSubmit, onSubmit, buildActionContext, onValidationError, actionExecutor],
	);

	/**
	 * Form instance context value
	 */
	const formInstanceContextValue: FormInstanceContextValue = useMemo(
		() => ({
			executeAction,
			handleFormChange,
			currentStep,
			totalSteps: config.steps.length,
			goToStep: (step: number) => setCurrentStep(step),
			goToNext: () => setCurrentStep((s) => Math.min(s + 1, config.steps.length - 1)),
			goToPrevious: () => setCurrentStep((s) => Math.max(s - 1, 0)),
		}),
		[executeAction, handleFormChange, currentStep, config.steps.length],
	);

	return (
		<FormProvider {...form}>
			<FormInstanceContext.Provider value={formInstanceContextValue}>
				<form onSubmit={form.handleSubmit(handleSubmit)} className={config.className} style={config.style}>
					{children}
				</form>
			</FormInstanceContext.Provider>
		</FormProvider>
	);
}
