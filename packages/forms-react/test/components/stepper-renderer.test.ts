import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FormConfig } from '@schema-engine/forms/schemas';

const { getStepper } = vi.hoisted(() => ({ getStepper: vi.fn() }));

vi.mock('../../src/components/internals/stepper-renderer.css', () => ({}));

vi.mock('@/hooks', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../src/hooks')>();
	return {
		...actual,
		useFormEngine: () => ({ engine: { getStepper } }),
	};
});

const { StepperRenderer } = await import('../../src/components/internals/stepper-renderer');

const steps: FormConfig['steps'] = [
	{ id: 'one', title: 'One', elements: [] },
	{ id: 'two', title: 'Two', elements: [] },
];

const navigation = {
	canGoNext: true,
	canGoPrevious: false,
	isFirstStep: true,
	isLastStep: false,
	goToStep: vi.fn(),
	goToNextStep: vi.fn(),
	goToPreviousStep: vi.fn(),
};

const stepStates = {
	completed: [false, false],
	valid: [false, false],
	visited: [true, false],
};

function renderStepper(form: FormConfig) {
	return renderToStaticMarkup(
		createElement(
			StepperRenderer,
			{
				form,
				steps,
				currentStepIndex: 0,
				stepStates,
				navigation,
			},
			createElement('div', null, 'fields'),
		),
	);
}

describe('StepperRenderer', () => {
	beforeEach(() => {
		getStepper.mockReset();
		getStepper.mockReturnValue({
			render: ({ children }: { children?: ReactNode }) =>
				createElement(
					'div',
					{ className: 'minimalist-stepper' },
					createElement('span', null, 'Progress'),
					children,
				),
		});
	});

	it('does not mount a registered stepper when $type is omitted', () => {
		const html = renderStepper({ id: 'registration', title: 'Account', mode: 'wizard', steps });

		expect(html).toContain('fields');
		expect(html).toContain('class="se-headless-stepper"');
		expect(html).not.toContain('class="minimalist-stepper"');
		expect(html).not.toContain('Progress');
		expect(getStepper).not.toHaveBeenCalled();
	});

	it('mounts the registered stepper when $type is set', () => {
		const html = renderStepper({
			id: 'registration',
			title: 'Account',
			mode: 'wizard',
			steps,
			stepper: { $type: 'minimalist', showProgress: true },
		});

		expect(html).toContain('class="minimalist-stepper"');
		expect(html).not.toContain('class="se-headless-stepper"');
		expect(html).toContain('Progress');
		expect(getStepper).toHaveBeenCalledWith('minimalist');
	});
});
