import * as z from 'zod/mini';

export const CardShellConfigSchema = z.strictObject({
	maxWidth: z._default(z.enum(['sm', 'md', 'lg', 'xl']), 'md'),
	padding: z._default(z.enum(['sm', 'md', 'lg']), 'md'),
	shadowSize: z._default(z.enum(['sm', 'md', 'lg', 'xl']), 'md'),
});

export const HeroShellConfigSchema = z.strictObject({
	backgroundImage: z.optional(z.string()),
	backgroundVideo: z.optional(z.string()),
	contentWidth: z._default(z.enum(['sm', 'md', 'lg', 'xl']), 'md'),
});

export const SplitScreenShellConfigSchema = z.strictObject({
	sideContent: z.optional(z.string()),
	sidePlacement: z._default(z.enum(['left', 'right']), 'left'),
	sideWidth: z._default(z.enum(['narrow', 'normal', 'wide']), 'normal'),
	contentAlignment: z._default(z.enum(['top', 'center', 'bottom']), 'center'),
});

export const SidebarShellConfigSchema = z.strictObject({
	showSeparator: z._default(z.boolean(), true),
});

export const StepHeaderConfigSchema = z.strictObject({
	showDescription: z._default(z.boolean(), true),
	showStepCounter: z._default(z.boolean(), false),
	labels: z.prefault(
		z.strictObject({
			stepCounter: z._default(
				z.string().check(z.describe('Template with {current} and {total}')),
				'Step {current} of {total}',
			),
		}),
		{},
	),
	size: z._default(z.enum(['sm', 'md', 'lg']), 'md'),
	align: z._default(z.enum(['start', 'center']), 'start'),
	fallbackToFormTitle: z._default(z.boolean(), true),
	titleAs: z._default(z.enum(['h1', 'h2']), 'h2'),
	inheritColor: z._default(z.boolean(), false),
	counterPlacement: z._default(z.enum(['before', 'after']), 'after'),
});

export const MinimalProgressConfigSchema = z.strictObject({
	showPercentage: z._default(z.boolean(), true),
	labels: z.prefault(
		z.strictObject({
			regionAriaLabel: z._default(z.string(), 'Form progress'),
			progress: z._default(z.string(), 'Progress'),
		}),
		{},
	),
});

export const StepIndicatorsConfigSchema = z.strictObject({
	orientation: z._default(z.enum(['horizontal', 'sidebar']), 'horizontal'),
	showStepNumbers: z._default(z.boolean(), true),
	showStepTitles: z._default(z.boolean(), true),
	showStepDescriptions: z._default(z.boolean(), false),
	labels: z.prefault(z.strictObject({ regionAriaLabel: z._default(z.string(), 'Form progress') }), {}),
});

export const WizardActionsConfigSchema = z.strictObject({
	labels: z.prefault(
		z.strictObject({
			previous: z._default(z.string(), 'Previous'),
			previousAriaLabel: z._default(z.string(), 'Go to previous step'),
			next: z._default(z.string(), 'Next'),
			nextAriaLabel: z._default(z.string(), 'Go to next step'),
			submit: z._default(z.string(), 'Submit'),
			submitAriaLabel: z._default(z.string(), 'Submit form'),
			submitting: z._default(z.string(), 'Submitting...'),
			stepCounter: z._default(
				z.string().check(z.describe('Template with {current} and {total}')),
				'Step {current} of {total}',
			),
		}),
		{},
	),
	showStepCounter: z._default(z.boolean(), true),
	appearance: z._default(z.enum(['default', 'minimal']), 'default'),
});

export const FormActionsConfigSchema = z.strictObject({
	labels: z.prefault(
		z.strictObject({
			submit: z._default(z.string(), 'Submit'),
			submitAriaLabel: z._default(z.string(), 'Submit form'),
			submitting: z._default(z.string(), 'Submitting...'),
		}),
		{},
	),
	align: z._default(z.enum(['start', 'center', 'end']), 'end'),
});

export type CardShellConfig = z.infer<typeof CardShellConfigSchema>;
export type HeroShellConfig = z.infer<typeof HeroShellConfigSchema>;
export type SplitScreenShellConfig = z.infer<typeof SplitScreenShellConfigSchema>;
export type SidebarShellConfig = z.infer<typeof SidebarShellConfigSchema>;
export type StepHeaderConfig = z.infer<typeof StepHeaderConfigSchema>;
export type MinimalProgressConfig = z.infer<typeof MinimalProgressConfigSchema>;
export type StepIndicatorsConfig = z.infer<typeof StepIndicatorsConfigSchema>;
export type WizardActionsConfig = z.infer<typeof WizardActionsConfigSchema>;
export type FormActionsConfig = z.infer<typeof FormActionsConfigSchema>;

export function formatStepCounter(template: string, current: number, total: number): string {
	return template.replaceAll('{current}', String(current)).replaceAll('{total}', String(total));
}
