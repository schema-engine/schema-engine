import { type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { createFormEngine } from '@schema-engine/forms';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { FieldSetRegistration } from '@/components/schema-engine/forms/inputs/form-fieldset.registration';
import { FormProvider } from '@/components/form-provider';
import { FormEngineContext } from '@/components/provider';
import type { FormProviderProps } from '@/hooks/form-state/types';

export const testEngine = createFormEngine({ elements: [InputElementRegistration, FieldSetRegistration] });

/** Renders `children` under a real `FormProvider` for `config`, with the engine's default validation registry. */
export function renderProvider(
	config: FormConfig,
	children: ReactNode,
	props: Partial<Omit<FormProviderProps, 'config' | 'children'>> = {},
) {
	return render(
		<FormEngineContext.Provider value={{ engine: testEngine }}>
			<FormProvider config={testEngine.validateForm(config)} {...props}>
				{children}
			</FormProvider>
		</FormEngineContext.Provider>,
	);
}
