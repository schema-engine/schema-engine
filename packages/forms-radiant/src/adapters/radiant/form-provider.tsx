import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '../types';
import { assertFormEngine } from '@schema-engine/forms';
import { FormInstance } from '@/components/form-instance';

export function FormProvider<TFormData extends Record<string, unknown> = Record<string, unknown>>({
	config,
	defaultValues,
	onSubmit,
	action,
	method,
	onChange,
	onAction,
	children,
	engine,
}: FormProviderProps<TFormData> & { engine?: CoreFormEngine }) {
	assertFormEngine(engine, config);
	const normalizedConfig = engine.validateForm(config);
	return (
		<FormInstance
			config={normalizedConfig}
			engine={engine}
			defaultValues={defaultValues}
			onChange={onChange as FormProviderProps['onChange']}
			onAction={onAction as FormProviderProps['onAction']}
			action={action}
			method={method}
			onSubmit={onSubmit as FormProviderProps['onSubmit']}
		>
			{children}
		</FormInstance>
	);
}
