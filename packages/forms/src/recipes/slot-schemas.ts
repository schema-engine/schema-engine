import * as z from 'zod/mini';

export const CardShellConfigSchema = z.strictObject({
	maxWidth: z.optional(z.enum(['sm', 'md', 'lg', 'xl'])),
	padding: z.optional(z.enum(['sm', 'md', 'lg'])),
	shadowSize: z.optional(z.enum(['sm', 'md', 'lg', 'xl'])),
});

export const HeroShellConfigSchema = z.strictObject({
	backgroundImage: z.optional(z.string()),
	backgroundVideo: z.optional(z.string()),
	contentWidth: z.optional(z.enum(['sm', 'md', 'lg', 'xl'])),
});

export const SplitScreenShellConfigSchema = z.strictObject({
	sideContent: z.optional(z.string()),
	sidePlacement: z.optional(z.enum(['left', 'right'])),
	sideWidth: z.optional(z.enum(['narrow', 'normal', 'wide'])),
	contentAlignment: z.optional(z.enum(['top', 'center', 'bottom'])),
});

export const SidebarShellConfigSchema = z.strictObject({
	showSeparator: z.optional(z.boolean()),
});

export const StepHeaderConfigSchema = z.strictObject({
	showDescription: z.optional(z.boolean()),
	showStepCounter: z.optional(z.boolean()),
	labels: z.optional(
		z.strictObject({
			stepCounter: z.optional(z.string()).check(z.describe('Template with {current} and {total}')),
		}),
	),
	size: z.optional(z.enum(['sm', 'md', 'lg'])),
	align: z.optional(z.enum(['start', 'center'])),
	titleAs: z.optional(z.enum(['h1', 'h2'])),
	inheritColor: z.optional(z.boolean()),
	counterPlacement: z.optional(z.enum(['before', 'after'])),
});

export const MinimalProgressConfigSchema = z.strictObject({
	showPercentage: z.optional(z.boolean()),
	labels: z.optional(
		z.strictObject({
			regionAriaLabel: z.optional(z.string()),
			progress: z.optional(z.string()),
		}),
	),
});

export const StepIndicatorsConfigSchema = z.strictObject({
	orientation: z.optional(z.enum(['horizontal', 'sidebar'])),
	showStepNumbers: z.optional(z.boolean()),
	showStepTitles: z.optional(z.boolean()),
	showStepDescriptions: z.optional(z.boolean()),
	labels: z.optional(z.strictObject({ regionAriaLabel: z.optional(z.string()) })),
});

export const WizardActionsConfigSchema = z.strictObject({
	labels: z.optional(
		z.strictObject({
			previous: z.optional(z.string()),
			previousAriaLabel: z.optional(z.string()),
			next: z.optional(z.string()),
			nextAriaLabel: z.optional(z.string()),
			submit: z.optional(z.string()),
			submitAriaLabel: z.optional(z.string()),
			submitting: z.optional(z.string()),
		}),
	),
	showStepCounter: z.optional(z.boolean()),
	appearance: z.optional(z.enum(['default', 'minimal'])),
});

export const DEFAULT_WIZARD_ACTION_LABELS = {
	previous: 'Previous',
	previousAriaLabel: 'Go to previous step',
	next: 'Next',
	nextAriaLabel: 'Go to next step',
	submit: 'Submit',
	submitAriaLabel: 'Submit form',
	submitting: 'Submitting...',
} as const;

export const FormActionsConfigSchema = z.strictObject({
	labels: z.optional(
		z.strictObject({
			submit: z.optional(z.string()),
			submitAriaLabel: z.optional(z.string()),
			submitting: z.optional(z.string()),
		}),
	),
	align: z.optional(z.enum(['start', 'center', 'end'])),
});

export const DEFAULT_FORM_ACTION_LABELS = {
	submit: 'Submit',
	submitAriaLabel: 'Submit form',
	submitting: 'Submitting...',
} as const;

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
