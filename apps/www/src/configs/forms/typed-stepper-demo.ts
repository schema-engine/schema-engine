/**
 * Test file demonstrating the improved stepper typing system
 * This file shows how TypeScript now provides proper IntelliSense and type safety
 * for stepper configurations instead of using [key: string]: any
 */

import type {
	FormConfig,
	ProgressBarStepperConfig,
	VerticalStepperConfig,
	MinimalistStepperConfig,
} from '@json-form-engine/core';

// Test 1: Progress Bar Stepper with typed configuration
const progressBarStepperTest: ProgressBarStepperConfig = {
	__stepperId: 'progress-bar',
	showLabels: true,
	variant: 'default', // TypeScript knows: 'default' | 'compact' | 'minimal'
	showProgress: true, // Specific to progress-bar stepper
	animate: false, // Specific to progress-bar stepper
	// TypeScript error if you try invalid properties!
	// invalidProp: 'test'     // ❌ This would cause a TypeScript error
};

// Test 2: Vertical Stepper with typed configuration
const verticalStepperTest: VerticalStepperConfig = {
	__stepperId: 'vertical',
	showLabels: true,
	showDescription: false,
	variant: 'compact', // TypeScript knows: 'default' | 'compact'
	position: 'right', // TypeScript knows: 'left' | 'right'
	width: '250px', // Specific to vertical stepper
};

// Test 3: Minimalist Stepper with typed configuration
const minimalistStepperTest: MinimalistStepperConfig = {
	__stepperId: 'minimalist',
	showLabels: false,
	variant: 'lines', // TypeScript knows: 'dots' | 'lines' | 'numbers'
	allowStepJumping: true, // Specific to minimalist stepper
	size: 'large', // TypeScript knows: 'small' | 'medium' | 'large'
};

// Test 4: Union type works correctly
// const stepperConfigUnion: StepperConfig = progressBarStepperTest; // ✅ Works
// const stepperConfigUnion2: StepperConfig = { __stepperId: 'invalid' }; // ❌ Would cause error

// Test 5: Form configuration with typed stepper
const testFormConfig: FormConfig = {
	mode: 'wizard',
	id: 'test-form',
	title: 'Typed Stepper Test',

	// TypeScript provides IntelliSense for stepper configuration
	stepper: {
		__stepperId: 'progress-bar',
		showLabels: true,
		variant: 'default', // IntelliSense suggests valid values
		showProgress: true, // IntelliSense only shows valid props for this stepper type
		animate: true,
	},

	steps: [
		{
			id: 'step1',
			title: 'Test Step',
			elements: [
				{
					id: 'test-field',
					componentId: 'input',
					inputType: 'text',
					name: 'testField',
					label: 'Test Field',
				},
			],
		},
	],
};

/**
 * Example of extending the stepper registry with a custom stepper
 * This demonstrates how developers can add their own steppers with full type safety
 */
declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		'custom-wizard': CustomWizardStepperConfig;
	}
}

interface CustomWizardStepperConfig {
	__stepperId: 'custom-wizard';
	theme: 'magical' | 'dark' | 'rainbow';
	sparkles: boolean;
	wizardMode: 'beginner' | 'advanced' | 'archmage';
}

// Now TypeScript recognizes the custom stepper!
const customStepperTest: CustomWizardStepperConfig = {
	__stepperId: 'custom-wizard',
	theme: 'magical',
	sparkles: true,
	wizardMode: 'archmage',
};

// And it works in form configurations too!
const formWithCustomStepper: FormConfig = {
	mode: 'wizard',
	id: 'custom-stepper-form',
	stepper: {
		__stepperId: 'custom-wizard',
		theme: 'rainbow', // TypeScript provides IntelliSense!
		sparkles: true,
		wizardMode: 'beginner', // TypeScript validates the values!
	},
	steps: [],
};

export {
	progressBarStepperTest,
	verticalStepperTest,
	minimalistStepperTest,
	testFormConfig,
	customStepperTest,
	formWithCustomStepper,
};
