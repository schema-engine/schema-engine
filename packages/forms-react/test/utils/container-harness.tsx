import { useState, type ReactNode } from 'react';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import {
	createFormStateContainer,
	type FormIssueFormatter,
	type FormStateContainer,
	type FormStateContainerConfig,
	type FormStateContainerOptions,
} from '@schema-engine/forms/state-container';
import { FormStateContext } from '@/hooks/form-state/context';
import { createFieldRegistry } from '@/hooks/form-state/field-registry';
import { createSubmissionStore, type SubmissionStore } from '@/hooks/form-state/submission-store';

/** What a test container is built from: the elements of one step and the timing, over the default validation registry. */
interface TestContainerOptions extends Pick<FormStateContainerOptions, 'defaults'> {
	elements?: FormStateContainerConfig['steps'][number]['elements'];
	validationMode?: FormStateContainerConfig['validationMode'];
	reValidateMode?: FormStateContainerConfig['reValidateMode'];
	payload?: FormStateContainerConfig['payload'];
}

/** A container over `elements` with the default validation registry. */
export function createTestContainer({
	elements = [],
	validationMode = 'onSubmit',
	reValidateMode = 'onChange',
	payload,
	...options
}: TestContainerOptions): FormStateContainer {
	return createFormStateContainer({
		config: { steps: [{ elements }], validationMode, reValidateMode, payload },
		registry: createDefaultValidationRegistry(),
		...options,
	});
}

/**
 * Provides the hooks with a container made outside React, so a test drives it directly and reads what the hooks show.
 *
 * @remarks The submission store is exposed through `onSubmission`, for a test that writes a submission.
 */
export function ContainerHarness({
	container,
	formatIssue,
	onSubmission,
	children,
}: {
	container: FormStateContainer;
	formatIssue?: FormIssueFormatter;
	onSubmission?: (submission: SubmissionStore) => void;
	children: ReactNode;
}) {
	const [{ fields, submission }] = useState(() => ({
		fields: createFieldRegistry(),
		submission: createSubmissionStore(),
	}));
	onSubmission?.(submission);
	return (
		<FormStateContext.Provider value={{ container, formatIssue, fields, submission }}>
			{children}
		</FormStateContext.Provider>
	);
}
