import { z } from 'zod';

export const CardShellConfigSchema = z
	.object({
		maxWidth: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
		padding: z.enum(['sm', 'md', 'lg']).optional(),
		shadowSize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
	})
	.strict();

export const HeroShellConfigSchema = z
	.object({
		backgroundImage: z.string().optional(),
		backgroundVideo: z.string().optional(),
		contentWidth: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
	})
	.strict();

export const SplitScreenShellConfigSchema = z
	.object({
		sideContent: z.string().optional(),
		sidePlacement: z.enum(['left', 'right']).optional(),
		sideWidth: z.enum(['narrow', 'normal', 'wide']).optional(),
		contentAlignment: z.enum(['top', 'center', 'bottom']).optional(),
	})
	.strict();

export const StepHeaderConfigSchema = z
	.object({
		showDescription: z.boolean().optional(),
		showStepCounter: z.boolean().optional(),
		labels: z
			.object({
				stepCounter: z.string().optional().describe('Template with {current} and {total}'),
			})
			.strict()
			.optional(),
		size: z.enum(['sm', 'md', 'lg']).optional(),
		align: z.enum(['start', 'center']).optional(),
		titleAs: z.enum(['h1', 'h2']).optional(),
		inheritColor: z.boolean().optional(),
		counterPlacement: z.enum(['before', 'after']).optional(),
	})
	.strict();

export const MinimalProgressConfigSchema = z
	.object({
		showPercentage: z.boolean().optional(),
		labels: z
			.object({
				regionAriaLabel: z.string().optional(),
				progress: z.string().optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

export const StepIndicatorsConfigSchema = z
	.object({
		orientation: z.enum(['horizontal', 'sidebar']).optional(),
		showStepNumbers: z.boolean().optional(),
		showStepTitles: z.boolean().optional(),
		showStepDescriptions: z.boolean().optional(),
		labels: z.object({ regionAriaLabel: z.string().optional() }).strict().optional(),
	})
	.strict();

export const WizardActionsConfigSchema = z
	.object({
		labels: z
			.object({
				previous: z.string().optional(),
				previousAriaLabel: z.string().optional(),
				next: z.string().optional(),
				nextAriaLabel: z.string().optional(),
				submit: z.string().optional(),
				submitAriaLabel: z.string().optional(),
				submitting: z.string().optional(),
			})
			.strict()
			.optional(),
		showStepCounter: z.boolean().optional(),
		appearance: z.enum(['default', 'minimal']).optional(),
	})
	.strict();

export const DEFAULT_WIZARD_ACTION_LABELS = {
	previous: 'Previous',
	previousAriaLabel: 'Go to previous step',
	next: 'Next',
	nextAriaLabel: 'Go to next step',
	submit: 'Submit',
	submitAriaLabel: 'Submit form',
	submitting: 'Submitting...',
} as const;

export type CardShellConfig = z.infer<typeof CardShellConfigSchema>;
export type HeroShellConfig = z.infer<typeof HeroShellConfigSchema>;
export type SplitScreenShellConfig = z.infer<typeof SplitScreenShellConfigSchema>;
export type StepHeaderConfig = z.infer<typeof StepHeaderConfigSchema>;
export type MinimalProgressConfig = z.infer<typeof MinimalProgressConfigSchema>;
export type StepIndicatorsConfig = z.infer<typeof StepIndicatorsConfigSchema>;
export type WizardActionsConfig = z.infer<typeof WizardActionsConfigSchema>;

export function formatStepCounter(template: string, current: number, total: number): string {
	return template.replaceAll('{current}', String(current)).replaceAll('{total}', String(total));
}
