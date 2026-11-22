import { useState, type ReactNode } from 'react';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import {
	createFormStateContainer,
	type FormIssueFormatter,
	type FormStateContainer,
	type FormStateContainerOptions,
} from '@schema-engine/forms/state-container';
import { FormStateContext } from '@/hooks/form-state/context';
import { createFieldRegistry } from '@/hooks/form-state/field-registry';
import { createSubmissionStatusStore, type SubmissionStatusStore } from '@/hooks/form-state/submission-status';

/** A container over `elements` with the default validation registry. */
export function createTestContainer(
	options: Partial<FormStateContainerOptions> & Pick<FormStateContainerOptions, 'defaults'>,
): FormStateContainer {
	return createFormStateContainer({
		elements: [],
		registry: createDefaultValidationRegistry(),
		validationMode: 'onSubmit',
		reValidateMode: 'onChange',
		...options,
	});
}

/**
 * Provides the hooks with a container made outside React, so a test drives it directly and reads what the hooks show.
 *
 * @remarks The status store is exposed through `onStatus`, for a test that writes a submission.
 */
export function ContainerHarness({
	container,
	formatIssue,
	onStatus,
	children,
}: {
	container: FormStateContainer;
	formatIssue?: FormIssueFormatter;
	onStatus?: (status: SubmissionStatusStore) => void;
	children: ReactNode;
}) {
	const [{ fields, status }] = useState(() => ({
		fields: createFieldRegistry(),
		status: createSubmissionStatusStore(),
	}));
	onStatus?.(status);
	return (
		<FormStateContext.Provider value={{ container, formatIssue, fields, status }}>
			{children}
		</FormStateContext.Provider>
	);
}
