import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '../types';
import { resolveValidatedConfig } from '@schema-engine/forms';
import { FormInstance } from '@/components/form-instance';
import { FormActionController } from '@/components/form-action-controller';

export function FormProvider<TFormData extends Record<string, unknown> = Record<string, unknown>>({
	config,
	defaultValues = {},
	onSubmit,
	children,
	engine,
}: FormProviderProps<TFormData> & { engine?: CoreFormEngine }) {
	const validatedConfig = resolveValidatedConfig(config, engine);
	const actionController = validatedConfig.actions?.length ? (
		<FormActionController config={validatedConfig} engine={engine} />
	) : null;

	return (
		<FormInstance
			config={validatedConfig}
			engine={engine}
			validated={true}
			defaultValues={defaultValues}
			onSubmit={onSubmit as ((data: Record<string, unknown>) => void | Promise<void>) | undefined}
		>
			{children}
			{actionController}
		</FormInstance>
	);
}
