import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const engine = createFormEngine({ recipes: [...schemaFormRecipeRegistrations] });

function renderForm(config: Record<string, unknown>) {
	const validated = engine.defineForm({
		id: 'recipe-blocks',
		steps: [
			{ id: 'one', title: 'One', elements: [] },
			{ id: 'two', title: 'Two', elements: [] },
			{ id: 'three', title: 'Three', elements: [] },
		],
		...config,
	} as Parameters<typeof engine.defineForm>[0]);
	return render(<FormRenderer config={validated} engine={engine} adapter={rhfAdapter} />);
}

describe('recipe blocks honour the slot config the spec accepts', () => {
	test('the actions step counter is localizable', async () => {
		renderForm({
			view: { $type: 'wizard', actions: { labels: { stepCounter: 'Schritt {current} von {total}' } } },
		});
		expect(screen.getByText('Schritt 1 von 3')).toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: 'Go to next step' }));

		expect(screen.getByText('Schritt 2 von 3')).toBeInTheDocument();
		expect(screen.queryByText(/^Step \d of/)).toBeNull();
	});

	test('the actions step counter keeps its English default', () => {
		renderForm({ view: { $type: 'wizard' } });

		expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
	});

	test('showPercentage false hides only the percentage', () => {
		renderForm({ view: { $type: 'card-wizard', progress: { showPercentage: false } } });

		expect(screen.getByText('Progress')).toBeInTheDocument();
		expect(screen.queryByText('33%')).toBeNull();
	});

	test('showPercentage true shows the percentage', () => {
		renderForm({ view: { $type: 'card-wizard' } });

		expect(screen.getByText('33%')).toBeInTheDocument();
	});

	test('the card header is centered', () => {
		renderForm({ view: { $type: 'card' }, steps: [{ id: 'one', title: 'One', elements: [] }] });

		expect(screen.getByRole('banner')).toHaveClass('text-center');
	});

	test('a split-screen-wizard shows the form title once when its steps have no title', () => {
		renderForm({
			title: 'Sign up',
			view: { $type: 'split-screen-wizard' },
			steps: [
				{ id: 'one', title: '', elements: [] },
				{ id: 'two', title: '', elements: [] },
			],
		});

		expect(screen.getAllByText('Sign up')).toHaveLength(1);
	});

	test('a split-screen-wizard shows the form title in the panel and the step title in the header', () => {
		renderForm({ title: 'Sign up', view: { $type: 'split-screen-wizard' } });

		expect(screen.getByRole('complementary')).toHaveTextContent('Sign up');
		expect(screen.getByRole('banner')).toHaveTextContent('One');
		expect(screen.getByRole('banner')).not.toHaveTextContent('Sign up');
	});

	test('a single-step split-screen keeps its panel title', () => {
		renderForm({
			title: 'Sign up',
			view: { $type: 'split-screen' },
			steps: [{ id: 'one', title: 'One', elements: [] }],
		});

		expect(screen.getByRole('complementary')).toHaveTextContent('Sign up');
	});
});
