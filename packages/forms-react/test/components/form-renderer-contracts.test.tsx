import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { z } from 'zod';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createReactFormComposer } from '@/registries/builder-registry';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';

const inputSchema = z.object({
	$type: z.literal('input'),
	id: z.string(),
	name: z.string(),
	label: z.string().optional(),
});

const submitSchema = z.object({
	$type: z.literal('submit'),
	id: z.string(),
	name: z.string(),
	label: z.string().optional(),
});

function createHeadlessEngine() {
	return createReactFormComposer()
		.addElement({
			$type: 'input',
			schema: inputSchema,
			metadata: { name: 'Input', category: 'input' },
			render: (props: { id: string; name: string; label?: string }) => (
				<label>
					{props.label}
					<input name={props.name} aria-label={props.label} data-testid={props.id} />
				</label>
			),
		})
		.addElement({
			$type: 'submit',
			schema: submitSchema,
			metadata: { name: 'Submit', category: 'action' },
			render: (props: { label?: string }) => <button type="submit">{props.label ?? 'Submit'}</button>,
		})
		.build();
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
	test('addElement -> build -> defineForm -> renderer', () => {
		const engine = createReactFormComposer()
			.addElement({
				$type: 'minimal-fixture',
				schema: createMinimalStandardSchema(),
				metadata: { name: 'Minimal fixture', category: 'input' },
				render: (props: MinimalFixtureConfig) => (
					<label>
						{props.label}
						<input name={props.name} aria-label={props.label} data-testid={props.id} />
					</label>
				),
			})
			.build();

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
