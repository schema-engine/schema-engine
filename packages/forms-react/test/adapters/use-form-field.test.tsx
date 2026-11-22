import { describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import type { ConstraintLogic } from '@schema-engine/forms/schemas/base-field';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import { RequiredRuleSchema } from '@schema-engine/forms/schemas/validation';
import { selectError } from '@schema-engine/forms/state-container';
import { useFormContext } from '@/hooks/form-state';
import { useControlledFormElement } from '@/hooks/use-field';
import { useFormField } from '@/hooks/form-state/use-form-field';
import { FormRenderer } from '@/components/internals/form-renderer';
import { ContainerHarness, createTestContainer } from '../utils/container-harness';

function BoundInput({
	name,
	id,
	disabled,
	constraints,
	onRender,
}: {
	name: string;
	id: string;
	disabled?: boolean;
	constraints?: ConstraintLogic[];
	onRender?: () => void;
}) {
	onRender?.();
	const { fieldProps, value, onChange, onBlur } = useControlledFormElement({
		name,
		id,
		$type: 'input',
		disabled,
		constraints,
	});

	return (
		<input
			data-testid={id}
			value={(value as string) ?? ''}
			onChange={(event) => onChange(event.target.value)}
			onBlur={onBlur}
			{...fieldProps}
		/>
	);
}

const rendersWith = (defaults: Record<string, unknown>, options?: Parameters<typeof createTestContainer>[0]) => {
	const container = createTestContainer({ defaults, ...options });
	return {
		container,
		harness: (children: React.ReactNode) => <ContainerHarness container={container}>{children}</ContainerHarness>,
	};
};

describe('useFormField', () => {
	test('registers a field ref so setFocus moves keyboard focus', async () => {
		function FocusHarness() {
			const { setFocus } = useFormContext();
			return (
				<>
					<BoundInput id="email" name="email" />
					<button type="button" onClick={() => setFocus('email')}>
						Focus email
					</button>
				</>
			);
		}
		const { harness } = rendersWith({ email: '' });
		render(harness(<FocusHarness />));

		const input = screen.getByTestId('email');
		expect(input).not.toHaveFocus();

		fireEvent.click(screen.getByRole('button', { name: 'Focus email' }));

		await waitFor(() => expect(input).toHaveFocus());
	});

	test('writes what the widget types into the container', () => {
		const { container, harness } = rendersWith({ email: '' });
		render(harness(<BoundInput id="email" name="email" />));

		fireEvent.change(screen.getByTestId('email'), { target: { value: 'a@b.co' } });

		expect(container.getValue('email')).toBe('a@b.co');
		expect(screen.getByTestId('email')).toHaveValue('a@b.co');
	});

	test('marks a disabled field disabled', () => {
		const { harness } = rendersWith({ visible: 'shown', secret: 'hidden' });
		render(
			harness(
				<>
					<BoundInput id="visible" name="visible" />
					<BoundInput id="secret" name="secret" disabled />
				</>,
			),
		);

		expect(screen.getByTestId('visible')).toBeEnabled();
		expect(screen.getByTestId('secret')).toBeDisabled();
	});

	test('does not re-render an unconstrained field when an unrelated field changes', () => {
		const onRender = vi.fn();
		const { container, harness } = rendersWith({ email: '', nickname: '' });
		render(
			harness(
				<>
					<BoundInput id="email" name="email" />
					<BoundInput id="nickname" name="nickname" onRender={onRender} />
				</>,
			),
		);

		const rendersAfterMount = onRender.mock.calls.length;
		act(() => container.setValue('email', 'a@b.co'));
		fireEvent.change(screen.getByTestId('email'), { target: { value: 'a@b.com' } });

		expect(screen.getByTestId('email')).toHaveValue('a@b.com');
		expect(onRender).toHaveBeenCalledTimes(rendersAfterMount);
	});

	test('marks a field required when its require constraint matches the watched sibling', () => {
		const requireWhenBusiness: ConstraintLogic[] = [
			{ field: 'accountType', operator: 'equals', value: 'business', action: 'require' },
		];
		const { harness } = rendersWith({ accountType: '', company: '' });
		render(
			harness(
				<>
					<BoundInput id="accountType" name="accountType" />
					<BoundInput id="company" name="company" constraints={requireWhenBusiness} />
				</>,
			),
		);

		expect(screen.getByTestId('company')).not.toBeRequired();

		fireEvent.change(screen.getByTestId('accountType'), { target: { value: 'business' } });

		expect(screen.getByTestId('company')).toBeRequired();
	});
});

describe('the text of an issue', () => {
	const elements = [
		{
			$type: 'input',
			name: 'code',
			rules: [{ type: 'minLength', value: 8, id: 'code-length' }],
		},
		{ $type: 'input', name: 'note', rules: [{ type: 'required', message: 'Note is required' }] },
	];

	function Probe({ name }: { name: string }) {
		const field = useFormField({ $type: 'input', name, id: name });
		return (
			<>
				<input aria-label={name} aria-invalid={field.invalid} />
				<output data-testid={`${name}-error`}>{field.error ?? ''}</output>
			</>
		);
	}
	const mount = (formatIssue?: Parameters<typeof ContainerHarness>[0]['formatIssue']) => {
		const container = createTestContainer({
			elements,
			defaults: { code: 'abc', note: '' },
			validationMode: 'onChange',
		});
		render(
			<ContainerHarness container={container} formatIssue={formatIssue}>
				<Probe name="code" />
				<Probe name="note" />
			</ContainerHarness>,
		);
		return container;
	};

	test('is the message the author wrote when no formatter is set', async () => {
		const container = mount();

		await act(async () => container.setValue('note', ''));
		await act(() => container.validate(['note']));

		expect(screen.getByTestId('note-error')).toHaveTextContent('Note is required');
	});

	test('is nothing, never the rule type, when the issue has no message and no formatter is set', async () => {
		const container = mount();

		await act(() => container.validate(['code']));

		expect(selectError(container.getSnapshot(), 'code')?.type).toBe('minLength');
		expect(screen.getByTestId('code-error')).toBeEmptyDOMElement();
		expect(screen.getByLabelText('code')).toHaveAttribute('aria-invalid', 'true');
	});

	test('is what the formatter says for the issue, with its rule id and params', async () => {
		const formatIssue = vi.fn(
			(issue: { type: string; ruleId?: string; params?: Readonly<Record<string, unknown>> }) =>
				`${issue.ruleId}:${issue.type}:${JSON.stringify(issue.params)}`,
		);
		const container = mount(formatIssue);

		await act(() => container.validate(['code']));

		expect(screen.getByTestId('code-error')).toHaveTextContent('code-length:minLength:{"minLength":8}');
		expect(formatIssue).toHaveBeenCalledWith(expect.objectContaining({ ruleId: 'code-length' }), { path: 'code' });
	});

	test('falls back to the message when the formatter says nothing', async () => {
		const container = mount(() => '');

		await act(() => container.validate(['note']));

		expect(screen.getByTestId('note-error')).toHaveTextContent('Note is required');
	});

	test('shows what a native input reported with its value', async () => {
		const container = mount((issue) => `native ${issue.type}`);

		function NativeInput() {
			const { onChange } = useFormField({ $type: 'input', name: 'code', id: 'code' });
			return (
				<button onClick={() => onChange('abcdefgh', { native: { type: 'patternMismatch' } })}>report</button>
			);
		}
		render(
			<ContainerHarness container={container}>
				<NativeInput />
			</ContainerHarness>,
		);
		await act(async () => screen.getByRole('button', { name: 'report' }).click());

		expect(selectError(container.getSnapshot(), 'code')).toMatchObject({
			type: 'patternMismatch',
			source: 'native',
		});
	});
});

describe('useControlledFormElement under FormRenderer', () => {
	function ConfiguredInput({ onRender, ...config }: ElementConfig & { onRender?: (name: string) => void }) {
		onRender?.(config.name ?? '');
		const { fieldProps, value, onChange } = useControlledFormElement(config);
		return (
			<input
				data-testid={config.id}
				value={(value as string) ?? ''}
				onChange={(event) => onChange(event.target.value)}
				{...fieldProps}
			/>
		);
	}

	function renderForm(fields: ElementConfig[], onRender?: (name: string) => void) {
		const engine = createFormEngine({
			elements: [
				defineInput({
					$type: 'field',
					schema: z.looseObject({ $type: z.literal('field'), id: z.string(), name: z.string() }),
					metadata: { name: 'Field', category: 'input' },
					render: (config: ElementConfig) => <ConfiguredInput {...config} onRender={onRender} />,
				}),
				defineInput({
					$type: 'required-field',
					schema: z.looseObject({ $type: z.literal('required-field'), id: z.string(), name: z.string() }),
					metadata: { name: 'Required field', category: 'input' },
					render: (config: ElementConfig) => <ConfiguredInput {...config} />,
					validations: [
						{
							$type: 'required',
							schema: RequiredRuleSchema,
							metadata: { name: 'Required' },
							category: 'string',
							defaultFor: ['required-field'],
							handler: () => z.string().check(z.minLength(1)),
						},
					],
				}),
				defineInput({
					$type: 'pair',
					schema: z.looseObject({ $type: z.literal('pair'), id: z.string(), name: z.string() }),
					metadata: { name: 'Pair', category: 'input' },
					render: (config: ElementConfig) => (
						<>
							<ConfiguredInput {...config} />
							<ConfiguredInput
								$type="required-field"
								id={`${config.id}-extra`}
								name={`${config.name}Extra`}
							/>
						</>
					),
				}),
			],
		});
		render(
			<FormRenderer
				config={engine.validateForm({ id: 'fields', steps: [{ id: 'main', title: 'Main', elements: fields }] })}
				engine={engine}
			/>,
		);
	}

	test('re-renders a constrained field when the field its constraint reads changes, and not for another', () => {
		const renders: string[] = [];
		renderForm(
			[
				{ $type: 'field', id: 'accountType', name: 'accountType' },
				{ $type: 'field', id: 'other', name: 'other' },
				{
					$type: 'field',
					id: 'company',
					name: 'company',
					constraints: [{ field: 'accountType', operator: 'equals', value: 'business', action: 'require' }],
				},
			],
			(name) => renders.push(name),
		);
		const companyRenders = () => renders.filter((name) => name === 'company').length;

		const afterMount = companyRenders();
		fireEvent.change(screen.getByTestId('other'), { target: { value: 'x' } });
		expect(companyRenders()).toBe(afterMount);

		fireEvent.change(screen.getByTestId('accountType'), { target: { value: 'business' } });
		expect(screen.getByTestId('company')).toBeRequired();
		expect(companyRenders()).toBeGreaterThan(afterMount);
	});

	test('marks a field required from the default rules registered for its type', () => {
		renderForm([{ $type: 'required-field', id: 'email', name: 'email' }]);

		expect(screen.getByTestId('email')).toBeRequired();
	});

	test('a control bound to another name evaluates its own required state', () => {
		renderForm([{ $type: 'pair', id: 'phone', name: 'phone' }]);

		expect(screen.getByTestId('phone')).not.toBeRequired();
		expect(screen.getByTestId('phone-extra')).toBeRequired();
	});
});
