import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/core-ui/accordion';

function TestAccordion() {
	return (
		<Accordion>
			<AccordionItem value="item-1">
				<AccordionTrigger>Section 1</AccordionTrigger>
				<AccordionContent>Content for section 1</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item-2">
				<AccordionTrigger>Section 2</AccordionTrigger>
				<AccordionContent>Content for section 2</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item-3">
				<AccordionTrigger>Section 3</AccordionTrigger>
				<AccordionContent>Content for section 3</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

describe('Accordion Component', () => {
	afterEach(() => {
		cleanup();
	});

	it('should render all accordion items', () => {
		render(<TestAccordion />);
		expect(screen.getByText('Section 1')).toBeInTheDocument();
		expect(screen.getByText('Section 2')).toBeInTheDocument();
		expect(screen.getByText('Section 3')).toBeInTheDocument();
	});

	it('should not render accordion content initially', () => {
		render(<TestAccordion />);
		expect(screen.queryByText('Content for section 1')).not.toBeInTheDocument();
		expect(screen.queryByText('Content for section 2')).not.toBeInTheDocument();
		expect(screen.queryByText('Content for section 3')).not.toBeInTheDocument();
	});

	it('should expand accordion item when clicked', async () => {
		render(<TestAccordion />);
		const triggerText = screen.getByText('Section 1');
		const trigger = triggerText.closest('button')!;

		fireEvent.click(trigger);

		await waitFor(() => expect(trigger).toHaveAttribute('data-panel-open'));
		expect(screen.getByText('Content for section 1')).toBeInTheDocument();
	});

	it('should collapse accordion item when clicked again', async () => {
		render(<TestAccordion />);
		const triggerText = screen.getByText('Section 1');
		const trigger = triggerText.closest('button')!;

		fireEvent.click(trigger);
		await waitFor(() => expect(screen.getByText('Content for section 1')).toBeInTheDocument());

		fireEvent.click(trigger);

		const trigger_element = trigger.closest('[data-slot="accordion-trigger"]');
		await waitFor(() => expect(trigger_element).not.toHaveAttribute('data-panel-open'));
		await waitFor(() => expect(screen.queryByText('Content for section 1')).not.toBeInTheDocument());
	});

	it('should apply correct CSS classes to accordion item', () => {
		render(<TestAccordion />);
		const items = screen.getAllByText(/Section \d/);
		const item = items[0].closest('[data-slot="accordion-item"]');

		expect(item).toHaveClass('border-b');
	});

	it('should remove bottom border from last item', () => {
		render(<TestAccordion />);
		const items = screen.getAllByText(/Section \d/);
		const lastItem = items[2].closest('[data-slot="accordion-item"]');

		expect(lastItem).toHaveClass('last:border-b-0');
	});

	it('should have proper data attributes on all elements', async () => {
		render(<TestAccordion />);
		const trigger = screen.getByText('Section 1').closest('button')!;
		fireEvent.click(trigger);

		await waitFor(() => expect(screen.getByText('Content for section 1')).toBeInTheDocument());

		expect(screen.getByText('Section 1').closest('[data-slot="accordion-trigger"]')).toBeInTheDocument();
		expect(
			screen.getByText('Content for section 1').closest('[data-slot="accordion-content"]'),
		).toBeInTheDocument();
		expect(document.querySelector('[data-slot="accordion"]')).toBeInTheDocument();
	});

	it('should ensure only one item is open at a time', async () => {
		render(<TestAccordion />);
		const trigger1 = screen.getByText('Section 1').closest('button')!;
		const trigger2 = screen.getByText('Section 2').closest('button')!;

		fireEvent.click(trigger1);
		await waitFor(() => expect(trigger1).toHaveAttribute('data-panel-open'));

		fireEvent.click(trigger2);
		await waitFor(() => expect(trigger2).toHaveAttribute('data-panel-open'));
		await waitFor(() => expect(trigger1).not.toHaveAttribute('data-panel-open'));
	});

	it('should handle keyboard navigation', async () => {
		render(<TestAccordion />);
		const user = userEvent.setup();
		const trigger = screen.getByText('Section 1').closest('button');

		trigger?.focus();
		expect(trigger).toHaveFocus();

		await user.keyboard('{Enter}');

		const trigger_element = screen.getByText('Section 1').closest('[data-slot="accordion-trigger"]');
		await waitFor(() => expect(trigger_element).toHaveAttribute('data-panel-open'));
	});

	it('should render with proper focus styles', async () => {
		render(<TestAccordion />);
		const trigger = screen.getByText('Section 1').closest('button');

		trigger?.focus();

		expect(trigger).toHaveClass('focus-visible:ring-[3px]');
		expect(trigger).toHaveClass('focus-visible:ring-ring/50');
	});

	it('should have proper disabled state styling', () => {
		render(<TestAccordion />);
		const trigger = screen.getByText('Section 1').closest('[data-slot="accordion-trigger"]');

		expect(trigger).toHaveClass('disabled:pointer-events-none');
		expect(trigger).toHaveClass('disabled:opacity-50');
	});
});
