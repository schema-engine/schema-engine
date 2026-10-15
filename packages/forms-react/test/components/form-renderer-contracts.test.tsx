import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as z from 'zod/mini';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';

const inputSchema = z.object({
	$type: z.literal('input'),
	id: z.string(),
	name: z.string(),
	label: z.optional(z.string()),
});

const submitSchema = z.object({
	$type: z.literal('submit'),
	id: z.string(),
	name: z.string(),
	label: z.optional(z.string()),
});

function createHeadlessEngine() {
	return createFormEngine({
		elements: [
			{
				$type: 'input',
				schema: inputSchema,
				metadata: { name: 'Input', category: 'input' },
				render: (props: { id: string; name: string; label?: string }) => (
					<label>
						{props.label}
						<input name={props.name} aria-label={props.label} data-testid={props.id} />
					</label>
				),
			},
			{
				$type: 'submit',
				schema: submitSchema,
				metadata: { name: 'Submit', category: 'action' },
				render: (props: { label?: string }) => <button type="submit">{props.label ?? 'Submit'}</button>,
			},
		],
	});
}

type MinimalFixtureConfig = {
	id: string;
	name: string;
	label?: string;
	$type: 'minimal-fixture';
};

function createMinimalStandardSchema(): StandardSchemaV1<MinimalFixtureConfig> {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate(value) {
				if (
					typeof value === 'object' &&
					value !== null &&
					'id' in value &&
					'name' in value &&
					'$type' in value &&
					(value as MinimalFixtureConfig).$type === 'minimal-fixture'
				) {
					return { value: value as MinimalFixtureConfig };
				}

				return { issues: [{ message: 'Invalid minimal-fixture config' }] };
			},
		},
	};
}

describe('FormRenderer missing-recipe fallback', () => {
	test('renders every step on one page when no wizard recipe is registered', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const engine = createHeadlessEngine();
		const config = engine.defineForm({
			id: 'headless-wizard',
			steps: [
				{
					id: 'one',
					title: 'One',
					elements: [{ $type: 'input', id: 'first-name', name: 'firstName', label: 'First name' }],
				},
				{
					id: 'two',
					title: 'Two',
					elements: [
						{ $type: 'input', id: 'last-name', name: 'lastName', label: 'Last name' },
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Send' },
					],
				},
			],
		});

		try {
			render(<FormRenderer config={config} engine={engine} adapter={rhfAdapter} />);

			expect(screen.getByLabelText('First name')).toBeInTheDocument();
			expect(screen.getByLabelText('Last name')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
			expect(warn).toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});

describe('native Standard Schema through FormRenderer', () => {
	test('createFormEngine -> defineForm -> renderer', () => {
		const engine = createFormEngine({
			elements: [
				{
					$type: 'minimal-fixture',
					schema: createMinimalStandardSchema(),
					metadata: { name: 'Minimal fixture', category: 'input' },
					render: (props: MinimalFixtureConfig) => (
						<label>
							{props.label}
							<input name={props.name} aria-label={props.label} data-testid={props.id} />
						</label>
					),
				},
			],
		});

		const config = engine.defineForm({
			id: 'native-ss',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'minimal-fixture', id: 'field-1', name: 'field-1', label: 'Fixture' }],
				},
			],
		});

		render(<FormRenderer config={config} engine={engine} adapter={rhfAdapter} />);
		expect(screen.getByLabelText('Fixture')).toBeInTheDocument();
	});
});

describe('transformed element configs through FormRenderer', () => {
	test('defineForm output with string-to-number transform renders without revalidation errors', () => {
		const countSchema = z.object({
			$type: z.literal('count'),
			id: z.string(),
			name: z.string(),
			label: z.optional(z.string()),
			count: z.pipe(
				z.string(),
				z.transform((value) => Number(value)),
			),
		});

		const engine = createFormEngine({
			elements: [
				{
					$type: 'count',
					schema: countSchema,
					metadata: { name: 'Count', category: 'input' },
					render: (props: { id: string; name: string; label?: string; count: number; $type: 'count' }) => (
						<label>
							{props.label}
							<input
								name={props.name}
								aria-label={props.label}
								data-testid={props.id}
								data-count={String(props.count)}
								data-type={props.$type}
							/>
						</label>
					),
				},
			],
		});

		const config = engine.defineForm({
			id: 'count-form',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'count', id: 'count', name: 'count', label: 'Count', count: '7' }],
				},
			],
		});

		render(<FormRenderer config={config} engine={engine} adapter={rhfAdapter} />);
		expect(screen.getByLabelText('Count')).toHaveAttribute('data-count', '7');
		expect(screen.getByLabelText('Count')).toHaveAttribute('data-type', 'count');
	});
});

describe('registry DOM prop boundaries', () => {
	test('does not forward schema metadata to native inputs', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		try {
			const engine = createFormEngine({ elements: [InputElementRegistration] });
			const config = engine.defineForm({
				id: 'dom-props',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [
							{
								$type: 'input',
								id: 'email',
								name: 'email',
								label: 'Email',
								inputType: 'email',
							},
						],
					},
				],
			});

			render(<FormRenderer config={config} engine={engine} adapter={rhfAdapter} />);

			expect(screen.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute('$type');
			expect(consoleError.mock.calls.flat().some((argument) => String(argument).includes('$type'))).toBe(false);
		} finally {
			consoleError.mockRestore();
		}
	});

	test('forwards htmlAttributes to the focusable control', () => {
		const engine = createFormEngine({ elements: [InputElementRegistration] });
		const config = engine.defineForm({
			id: 'dom-props-html',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							inputType: 'email',
							htmlAttributes: { 'data-testid': 'email-field' },
						},
					],
				},
			],
		});

		render(<FormRenderer config={config} engine={engine} adapter={rhfAdapter} />);

		const input = screen.getByRole('textbox', { name: 'Email' });
		expect(input).toHaveAttribute('data-testid', 'email-field');
		expect(input).not.toHaveAttribute('$type');
	});
});
