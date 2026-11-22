import { type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { createFormEngine } from '@schema-engine/forms';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { FieldSetRegistration } from '@/components/schema-engine/forms/inputs/form-fieldset.registration';
import { FormProvider } from '@/components/form-provider';
import { FormEngineContext } from '@/components/provider';
import type { FormProviderProps } from '@/adapters/types';

export const testEngine = createFormEngine({ elements: [InputElementRegistration, FieldSetRegistration] });

/** Renders `children` under a real `FormProvider` for `config`, with the engine's default validation registry. */
export function renderProvider(
	config: FormConfig,
	children: ReactNode,
	props: Partial<Omit<FormProviderProps, 'config' | 'children'>> & { engineFormatIssue?: FormIssueFormatter } = {},
) {
	const { engineFormatIssue, ...providerProps } = props;
	return render(
		<FormEngineContext.Provider value={{ engine: testEngine, formatIssue: engineFormatIssue }}>
			<FormProvider config={testEngine.validateForm(config)} {...providerProps}>
				{children}
			</FormProvider>
		</FormEngineContext.Provider>,
	);
}
