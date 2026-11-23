import { containerOptions } from '@/testing/form-state-container-conformance';
import { describe, expect, test } from 'vitest';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import {
	FORM_ROOT,
	type FormIssueFormatter,
	type FormStateContainer,
	type FormStateIssue,
	type FormSubmissionIssue,
} from '@/state-container/types';

/**
 * The container with its methods as function-typed properties, so each is compared strictly rather than by
 * method bivariance.
 */
type Strict<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => R : T[K];
};

/**
 * A local copy of the interface a host that bridges native controls into a form state container needs.
 *
 * @remarks
 * It checks a copy, not the host's own declaration: the host's interface has to declare the same members,
 * or this proves nothing about it. The conformance suite is the guard on behaviour.
 */
type BridgeNativeValidity = { type: string; params?: Record<string, unknown>; message?: string };

/** The issue and error of a host that is generic over them, as Radiant UI's `FormStateStore<TIssue>` is. */
type BridgeError<TIssue> = TIssue & { readonly all: readonly TIssue[] };

interface BridgeFormState<TIssue> {
	getValue: (path: string) => unknown;
	setValue: (path: string, value: unknown) => void;
	blur: (path: string) => void;
	getSnapshot: () => {
		readonly values: Readonly<Record<string, unknown>>;
		readonly errors: Readonly<Record<string, BridgeError<TIssue>>>;
		readonly warnings: Readonly<Record<string, BridgeError<TIssue>>>;
	};
	subscribe: (listener: () => void) => () => void;
	reset: () => void;
	validate: () => Promise<{ outcome: 'passed' | 'invalid' | 'overtaken' }>;
	checkValidity: () => Promise<boolean>;
	reportNative: (facts: Record<string, BridgeNativeValidity | null>) => void;
}

/** What the host takes as its formatter: the same issue type, so one function serves the container's own errors. */
type BridgeFormatter<TIssue> = (issue: TIssue, field: { path: string }) => string;

interface NotTheBridge {
	checkValidity: () => Promise<string>;
}

const element = (config: Record<string, unknown>) => markNormalizedElementConfig(config as unknown as ElementConfig);

const asBridge = (container: Strict<FormStateContainer>): BridgeFormState<FormStateIssue> => container;

/** Text for an issue, as an application's i18n layer writes it. */
const formatIssue = (issue: FormStateIssue | FormSubmissionIssue, field: { path: string }): string =>
	`${field.path}: ${issue.type}`;

describe('the form state container as a bridge host sees it', () => {
	test('is assignable to the bridge interface with strict function types', async () => {
		const container = createFormStateContainer(
			containerOptions({
				registry: createDefaultValidationRegistry(),
				elements: [element({ $type: 'input', name: 'name' })],
			}),
		);
		const bridge = asBridge(container);
		bridge.setValue('name', '');
		bridge.blur('name');
		bridge.reportNative({ name: { type: 'valueMissing', message: 'Fill in this field' } });
		expect(await container.validate()).toEqual({ outcome: 'invalid' });
		expect(bridge.getSnapshot().errors.name?.message).toBe('Fill in this field');
		bridge.reportNative({ name: null });
		expect(await container.validate(['name'])).toEqual({ outcome: 'passed' });
		bridge.reportNative({ name: { type: 'tooShort', params: { minLength: 8 } }, 'nothing.here': null });
		expect(bridge.getSnapshot().warnings).toEqual({});
		bridge.reportNative({ name: null });
		expect(await bridge.checkValidity()).toBe(true);
	});

	test('the issue the container reports is the one a host formatter takes, without a cast', async () => {
		const forHost: BridgeFormatter<FormStateIssue> = formatIssue;
		const forEngine: FormIssueFormatter = formatIssue;
		const container = createFormStateContainer(
			containerOptions({
				registry: createDefaultValidationRegistry(),
				elements: [element({ $type: 'input', name: 'name' })],
			}),
		);
		const submitted = await container.submit();
		if (submitted.outcome !== 'passed') throw new Error('The submission did not pass.');
		submitted.setServerErrors({ name: { type: 'taken' } });
		const error = asBridge(container).getSnapshot().errors.name;
		expect(forHost(error, { path: 'name' })).toBe('name: taken');
		expect(forEngine(error.all[0], { path: 'name' })).toBe('name: taken');
		expect(forEngine({ type: 'actionFailed', source: 'submission' }, { path: FORM_ROOT })).toBe(
			'__root__: actionFailed',
		);
	});

	test('is checked strictly', () => {
		const container = createFormStateContainer(
			containerOptions({
				registry: createDefaultValidationRegistry(),
				elements: [element({ $type: 'input', name: 'name' })],
			}),
		);
		// @ts-expect-error the container resolves a boolean, so it does not fit a checkValidity that resolves a string
		const notFit: NotTheBridge = container;
		expect(notFit).toBe(container);
	});
});
