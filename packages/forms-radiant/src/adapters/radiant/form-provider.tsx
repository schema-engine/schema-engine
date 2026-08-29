import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '../types';
import { FormElementsRenderer } from '@/components/internals/form-elements-renderer';
import { FormInstance } from '@/components/form-instance';
import { ConfiguredRuiForm } from './rui-form-shell';

function isMultiStepForm(config: FormProviderProps['config']): boolean {
	return config.steps.length > 1;
}

export function FormProvider<TFormData extends Record<string, unknown> = Record<string, unknown>>({
	config,
	defaultValues = {},
	onSubmit,
	children,
	engine,
}: FormProviderProps<TFormData> & { engine?: CoreFormEngine }) {
	if (isMultiStepForm(config)) {
		return (
			<FormInstance
				config={config}
				engine={engine}
				defaultValues={defaultValues}
				onSubmit={onSubmit as ((data: Record<string, unknown>) => void | Promise<void>) | undefined}
			>
				{children}
			</FormInstance>
		);
	}

	return (
		<ConfiguredRuiForm
			config={config}
			defaultValues={defaultValues}
			onSubmit={onSubmit as ((data: Record<string, unknown>) => void | Promise<void>) | undefined}
		>
			<FormElementsRenderer config={config} engine={engine} />
			{children}
		</ConfiguredRuiForm>
	);
}
