import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import * as v from 'valibot';
import { createFormEngine } from '@schema-engine/forms';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { FormRenderer } from '@/components/internals/form-renderer';
import { useViewConfig } from '@/contexts/view-context';
import { defineRecipe, type FormShellProps } from '@/primitives';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';

const ShellSchema = v.strictObject({ accent: v.optional(v.string(), '#000000') });

function BrandShell({ slots }: FormShellProps) {
	const { accent } = useViewConfig('shell', ShellSchema);
	return (
		<div data-testid="brand-shell" data-accent={accent}>
			{slots.content}
		</div>
	);
}

const BrandRecipe = defineRecipe(
	defineRecipeSpec({
		$type: 'brand',
		kind: 'single-step',
		metadata: { name: 'Brand', description: 'A shell whose config is a Valibot schema' },
		slotSchemas: { shell: ShellSchema },
	}),
	{ shell: BrandShell, slots: {} },
);

const engine = createFormEngine({ elements: [InputElementRegistration], recipes: [BrandRecipe] });
const steps = [
	{
		id: 'main',
		title: 'Main',
		elements: [{ $type: 'input' as const, id: 'name-field', name: 'name', label: 'Name' }],
	},
];

describe('a recipe whose slot schema is a Valibot schema', () => {
	test('the shell reads the config the view authored', () => {
		const config = engine.defineForm({
			id: 'authored',
			view: { $type: 'brand', shell: { accent: '#111111' } },
			steps,
		});

		render(<FormRenderer config={config} engine={engine} />);

		expect(screen.getByTestId('brand-shell')).toHaveAttribute('data-accent', '#111111');
		expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
	});

	test('the shell reads the schema default when the view omits the slot', () => {
		const config = engine.defineForm({ id: 'omitted', view: { $type: 'brand' }, steps });

		render(<FormRenderer config={config} engine={engine} />);

		expect(screen.getByTestId('brand-shell')).toHaveAttribute('data-accent', '#000000');
	});
});
