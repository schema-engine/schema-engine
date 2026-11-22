import { describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import type { ConstraintLogic } from '@schema-engine/forms/schemas/base-field';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import { RequiredRuleSchema } from '@schema-engine/forms/schemas/validation';
import { selectError } from '@schema-engine/forms/state-container';
import { FORM_ROOT, useFormContext } from '@/hooks/form-state';
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
	const { fieldProps, value, onChange, onBlur } = useFormField({
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

	test('hands the engine error, with its type and params, as the raw issue', async () => {
		const container = mount();

		await act(() => container.validate(['code']));

		function RawIssue() {
			const { issue } = useFormField('code');
			return <output data-testid="raw">{`${issue?.type}:${issue?.all.length}`}</output>;
		}
		render(
			<ContainerHarness container={container}>
				<RawIssue />
			</ContainerHarness>,
		);

		expect(screen.getByTestId('raw')).toHaveTextContent('minLength:1');
	});
});

describe('useFormField with a path', () => {
	const elements = [
		{ $type: 'input', name: 'code', rules: [{ type: 'minLength', value: 8 }] },
		{ $type: 'input', name: 'note' },
	];

	function PathProbe({ path }: { path: string }) {
		const field = useFormField(path);
		return (
			<>
				<output data-testid="state">
					{JSON.stringify({
						name: field.name,
						value: field.value,
						error: field.error,
						invalid: field.invalid,
						isTouched: field.isTouched,
						isDirty: field.isDirty,
						isValidating: field.isValidating,
					})}
				</output>
				<button onClick={() => field.onChange('edited')}>write</button>
				<button onClick={field.onBlur}>blur</button>
			</>
		);
	}

	function mount(
		path: string,
		formatIssue?: Parameters<typeof ContainerHarness>[0]['formatIssue'],
		defaults: Record<string, unknown> = { code: 'abc', note: '' },
	) {
		const container = createTestContainer({
			elements,
			defaults,
			validationMode: 'onSubmit',
		});
		render(
			<ContainerHarness container={container} formatIssue={formatIssue}>
				<PathProbe path={path} />
			</ContainerHarness>,
		);
		const state = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}');
		return { container, state };
	}

	test('reports the value and the flags of the field, and writes and blurs it', async () => {
		const { container, state } = mount('note');
		expect(state()).toMatchObject({ name: 'note', value: '', invalid: false, isTouched: false, isDirty: false });

		await act(async () => screen.getByRole('button', { name: 'write' }).click());
		await act(async () => screen.getByRole('button', { name: 'blur' }).click());

		expect(container.getValue('note')).toBe('edited');
		expect(state()).toMatchObject({ value: 'edited', isTouched: true, isDirty: true });
	});

	test('formats the error of the form itself at FORM_ROOT', async () => {
		const { container, state } = mount(FORM_ROOT, (issue) => `said ${issue.type}`, {
			code: 'abcdefghij',
			note: '',
		});
		expect(state()).toMatchObject({ invalid: false });

		const submitted = await container.submit();
		expect(submitted.outcome).toBe('passed');
		if (submitted.outcome !== 'passed') return;
		await act(async () => submitted.setServerErrors({ [FORM_ROOT]: { type: 'down' } }));

		expect(state()).toMatchObject({ name: FORM_ROOT, invalid: true, error: 'said down' });
	});

	test('returns the state of the path and none of the parts derived from a config', () => {
		function Keys() {
			return <output data-testid="keys">{Object.keys(useFormField('note')).sort().join(',')}</output>;
		}
		render(
			<ContainerHarness container={createTestContainer({ defaults: { note: '' } })}>
				<Keys />
			</ContainerHarness>,
		);

		expect(screen.getByTestId('keys')).toHaveTextContent(
			'invalid,isDirty,isTouched,isValidating,issue,name,onBlur,onChange,ref,value',
		);
	});
});

describe('useFormField with a config', () => {
	function Widget() {
		const field = useFormField({ $type: 'input', name: 'email', id: 'email-id', rules: [{ type: 'required' }] });
		return (
			<>
				<input data-testid="control" {...field.fieldProps} />
				<label data-testid="label" {...field.labelProps} />
				{field.errorProps ? <p data-testid="alert" {...field.errorProps} /> : null}
			</>
		);
	}

	test('wires the control, label and error to the id of the element', async () => {
		const container = createTestContainer({
			elements: [{ $type: 'input', name: 'email', rules: [{ type: 'required', message: 'Required' }] }],
			defaults: { email: '' },
		});
		render(
			<ContainerHarness container={container}>
				<Widget />
			</ContainerHarness>,
		);
		expect(screen.getByTestId('control')).toHaveAttribute('id', 'email-id');
		expect(screen.getByTestId('label')).toHaveAttribute('for', 'email-id');
		expect(screen.queryByTestId('alert')).toBeNull();

		await act(() => container.validate());

		expect(screen.getByTestId('control')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByTestId('control')).toHaveAttribute('aria-describedby', 'email-id-error');
		expect(screen.getByTestId('alert')).toHaveAttribute('id', 'email-id-error');
		expect(screen.getByTestId('alert')).toHaveAttribute('role', 'alert');
	});

	test('throws for a config with no name', () => {
		const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		function Nameless() {
			useFormField({ $type: 'input', name: '', id: 'x' });
			return null;
		}

		expect(() =>
			render(
				<ContainerHarness container={createTestContainer({ defaults: {} })}>
					<Nameless />
				</ContainerHarness>,
			),
		).toThrow('missing required "name"');
		errors.mockRestore();
	});
});

describe('useFormField under FormRenderer', () => {
	function ConfiguredInput({ onRender, ...config }: ElementConfig & { onRender?: (name: string) => void }) {
		onRender?.(config.name ?? '');
		const { fieldProps, value, onChange } = useFormField(config);
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
