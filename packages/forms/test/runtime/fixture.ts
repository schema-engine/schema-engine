import { vi, type Mock } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { createFormRuntime } from '@/runtime';
import type { CreateFormRuntimeOptions } from '@/runtime';
import { defineInput } from '@/types';
import type { FormActionConfig } from '@/engine/submission-lifecycle';

/** A step trigger or lifecycle trigger the probe action saw, with the step that was current. */
export interface Seen {
	trigger: string;
	stepId: string;
	currentStep: number;
	totalSteps: number;
}

export function createFixture() {
	const seen: Seen[] = [];
	const failing = new Set<string>();
	const probe = {
		$type: 'probe',
		schema: z.looseObject({ $type: z.literal('probe'), id: z.string() }),
		metadata: { name: 'Probe' },
		execute: async (context: { trigger: string; stepId: string; currentStep: number; totalSteps: number }) => {
			seen.push({
				trigger: context.trigger,
				stepId: context.stepId,
				currentStep: context.currentStep,
				totalSteps: context.totalSteps,
			});
			return failing.has(context.trigger)
				? { success: false, error: 'probe failed', shouldContinue: false }
				: { success: true };
		},
	};
	const gate = { waiting: [] as Array<() => void> };
	const engine = createFormEngine({
		validations: [
			{
				$type: 'gate',
				schema: z.object({ type: z.literal('gate') }),
				metadata: { name: 'Gate' },
				category: 'generic',
				handler: () =>
					z.any().check(
						z.refine(
							() =>
								new Promise<boolean>((resolve) => {
									gate.waiting.push(() => resolve(true));
								}),
						),
					),
			},
		],
		elements: [
			defineInput({
				$type: 'input',
				schema: z.looseObject({ $type: z.literal('input'), name: z.string() }),
				metadata: { name: 'Input', category: 'input' },
				render: (_props: Record<string, unknown>) => null,
			}),
			defineInput({
				$type: 'group',
				containerKind: 'object',
				schema: z.looseObject({ $type: z.literal('group'), name: z.string() }),
				metadata: { name: 'Group', category: 'input' },
				render: (_props: Record<string, unknown>) => null,
			}),
		],
		actions: [probe],
	});
	return { engine, seen, failing, gate };
}

const required = [{ type: 'required' }];
const input = (name: string, extra: Record<string, unknown> = {}) => ({ $type: 'input', name, ...extra });

/**
 * A four-step form: `contact` (with `hasCompany`), `company` (shown only when `hasCompany` is true),
 * `address` and `payment`. Every step has a required field, and each step has a probe action on every step trigger.
 */
export function wizardConfig(extra: Record<string, unknown> = {}, emailRules: unknown[] = required) {
	const probes = (id: string) => [
		{
			id: `probe-${id}`,
			$type: 'probe',
			triggers: [
				'step_leave',
				'step_change',
				'step_enter',
				'form_mount',
				'form_change',
				'form_submit',
				'form_submit_start',
				'form_submit_success',
				'form_submit_error',
				'form_submit_complete',
			],
		},
	];
	return {
		id: 'wizard',
		steps: [
			{ id: 'contact', title: 'Contact', elements: [input('email', { rules: emailRules }), input('hasCompany')] },
			{
				id: 'company',
				title: 'Company',
				constraints: [{ field: 'hasCompany', operator: 'equals', value: true, action: 'show' }],
				elements: [input('companyName', { rules: required })],
			},
			{ id: 'address', title: 'Address', elements: [input('street', { rules: required })] },
			{ id: 'payment', title: 'Payment', elements: [input('card', { rules: required })] },
		],
		actions: probes('form'),
		...extra,
	};
}

export interface Host {
	focus: Mock<(paths: readonly string[]) => void>;
	sync: Mock<() => void>;
	submitNatively: Mock<() => void>;
}

export function createHost(): Host {
	return { focus: vi.fn(), sync: vi.fn(), submitNatively: vi.fn() };
}

export function setup(
	config: Record<string, unknown> = wizardConfig(),
	options: Partial<Omit<CreateFormRuntimeOptions<FormActionConfig>, 'engine' | 'config' | 'host'>> = {},
) {
	const fixture = createFixture();
	const host = createHost();
	const runtime = createFormRuntime({
		engine: fixture.engine,
		config: fixture.engine.validateForm(config),
		host,
		...options,
	});
	const stop = runtime.mount();
	return { ...fixture, host, runtime, stop };
}

/** Writes the values of a whole wizard that satisfy every required field. */
export const fill = (runtime: ReturnType<typeof setup>['runtime'], values: Record<string, unknown>) => {
	for (const [name, value] of Object.entries(values)) runtime.container.setValue(name, value);
};
