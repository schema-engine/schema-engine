import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '../types';
import { assertFormEngine } from '@schema-engine/forms';
import { FormInstance } from '@/components/form-instance';
import { FormActionController } from '@/components/form-action-controller';

export function FormProvider<TFormData extends Record<string, unknown> = Record<string, unknown>>({
	config,
	defaultValues = {},
	onSubmit,
	children,
	engine,
}: FormProviderProps<TFormData> & { engine?: CoreFormEngine }) {
	assertFormEngine(engine, config);
	const normalizedConfig = engine.validateForm(config);
	const actionController = normalizedConfig.actions?.length ? (
		<FormActionController config={normalizedConfig} engine={engine} />
	) : null;

	return (
		<FormInstance
			config={normalizedConfig}
			engine={engine}
			defaultValues={defaultValues}
			onSubmit={onSubmit as ((data: Record<string, unknown>) => void | Promise<void>) | undefined}
		>
			{children}
			{actionController}
		</FormInstance>
	);
}
