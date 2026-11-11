import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { useViewContext } from '@/contexts/view-context';
import { defineRecipe } from '@/primitives';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';

describe('recipe view model', () => {
	test('a slot does not re-render when an unrelated field value changes', async () => {
		let slotRenders = 0;
		function CountingHeader() {
			const { form } = useViewContext();
			slotRenders += 1;
			return <header>{form.id}</header>;
		}
		const recipe = defineRecipe(
			defineRecipeSpec({
				$type: 'counting',
				kind: 'single-step',
				metadata: { name: 'Counting', description: 'Counts header renders' },
				slotSchemas: { header: z.strictObject({}) },
			}),
			{ slots: { header: CountingHeader } },
		);
		const engine = createFormEngine({ elements: [InputElementRegistration], recipes: [recipe] });
		const config = engine.defineForm({
			id: 'counting-form',
			view: { $type: 'counting' },
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'input', id: 'name-field', name: 'name', label: 'Name' }],
				},
			],
		});

		render(<FormRenderer config={config} engine={engine} adapter={rhfAdapter} />);
		expect(screen.getByText('counting-form')).toBeInTheDocument();
		const rendersBefore = slotRenders;
		expect(rendersBefore).toBeGreaterThan(0);
		await userEvent.fill(screen.getByRole('textbox', { name: 'Name' }), 'Ada');

		expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada');
		expect(slotRenders).toBe(rendersBefore);
	});
});
