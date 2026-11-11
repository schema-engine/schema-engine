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

describe('recipe progress blocks expose the right semantics', () => {
	test('step indicators expose the current and completed steps', async () => {
		renderForm({ view: { $type: 'wizard' } });
		await userEvent.click(screen.getByRole('button', { name: 'Go to next step' }));

		expect(screen.getByRole('button', { current: 'step' })).toHaveAccessibleName(/Two/);
		expect(screen.getByRole('button', { name: /One/ })).toHaveAccessibleName(/completed/);
		expect(screen.getByRole('button', { name: /Three/ })).not.toHaveAccessibleName(/completed/);
	});

	test('a completed step keeps its number in the name when titles are hidden', async () => {
		renderForm({ view: { $type: 'wizard', progress: { showStepTitles: false } } });
		await userEvent.click(screen.getByRole('button', { name: 'Go to next step' }));

		expect(screen.getByRole('button', { name: 'Step 1, completed' })).toBeInTheDocument();
	});

	test('the completed status is localizable', async () => {
		renderForm({
			view: { $type: 'wizard', progress: { labels: { completed: 'Schritt {current} abgeschlossen' } } },
		});
		await userEvent.click(screen.getByRole('button', { name: 'Go to next step' }));

		expect(screen.getByRole('button', { name: /One/ })).toHaveAccessibleName(/Schritt 1 abgeschlossen/);
	});

	test('an untitled step falls back to a localizable title', () => {
		renderForm({
			view: { $type: 'wizard', progress: { labels: { untitledStep: 'Schritt {current}' } } },
			steps: [
				{ id: 'one', title: '', elements: [] },
				{ id: 'two', title: '', elements: [] },
			],
		});

		expect(screen.getByRole('button', { name: /Schritt 1/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Schritt 2/ })).toBeInTheDocument();
	});

	test('minimal progress is a labelled progressbar and not a navigation landmark', async () => {
		renderForm({ view: { $type: 'card-wizard' } });
		const bar = screen.getByRole('progressbar', { name: 'Progress' });

		expect(screen.queryByRole('navigation')).toBeNull();
		expect(bar).toHaveAttribute('aria-valuemin', '0');
		expect(bar).toHaveAttribute('aria-valuemax', '100');
		expect(bar).toHaveAttribute('aria-valuenow', '33');
		expect(bar).toHaveAttribute('aria-valuetext', 'Step 1 of 3');

		await userEvent.click(screen.getByRole('button', { name: 'Go to next step' }));

		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Step 2 of 3');
	});

	test('the progress bar is named by the localizable visible label', () => {
		renderForm({
			view: { $type: 'card-wizard', progress: { showPercentage: false, labels: { progress: 'Fortschritt' } } },
		});

		expect(screen.getByRole('progressbar', { name: 'Fortschritt' })).toBeInTheDocument();
	});

	test('the progress value text is localizable', () => {
		renderForm({
			view: { $type: 'card-wizard', progress: { labels: { valueText: 'Schritt {current} von {total}' } } },
		});

		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Schritt 1 von 3');
	});

	test('the visible percentage is hidden from assistive technology', () => {
		renderForm({ view: { $type: 'card-wizard' } });

		expect(screen.getByText('33%')).toHaveAttribute('aria-hidden', 'true');
	});
});
