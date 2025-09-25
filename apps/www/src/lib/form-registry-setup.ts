/**
 * Centralized form registry setup
 * This ensures all registrations happen immediately when imported
 */

// Import field registries first
import '@json-form-engine/react/components/form/fields/form-input.registry';
import '@json-form-engine/react/components/form/fields/form-textarea.registry';
import '@json-form-engine/react/components/form/fields/form-radio.registry';
import '@json-form-engine/react/components/form/fields/form-checkbox.registry';
import '@json-form-engine/react/components/form/fields/form-select.registry';
import '@json-form-engine/react/components/form/fields/form-number.registry';

// Import layout and stepper components directly
import { reactStepperRegistry } from '@json-form-engine/react/components/layout-stepper-registry';
import { reactLayoutRegistry } from '@json-form-engine/react/components/layout-stepper-registry';

// Import the actual components
import {
	ProgressBarStepper,
	VerticalStepsStepper,
	MinimalistStepper,
} from '@json-form-engine/react/components/steppers/example-steppers';

import {
	SplitScreenLayout,
	HeroBackgroundLayout,
	CardLayout,
} from '@json-form-engine/react/components/layouts/example-layouts';

// Register steppers immediately (synchronously)
reactStepperRegistry.register({
	stepperId: 'progress-bar',
	name: 'Progress Bar Stepper',
	description: 'Show progress as a horizontal progress bar with step indicators',
	component: ProgressBarStepper,
	defaultConfig: {
		showStepNumbers: true,
		showStepTitles: true,
		primaryColor: '#3b82f6',
		completedColor: '#10b981',
		backgroundColor: '#e5e7eb',
	},
});

reactStepperRegistry.register({
	stepperId: 'vertical',
	name: 'Vertical Steps Stepper',
	description: 'Show steps as a vertical timeline',
	component: VerticalStepsStepper,
	defaultConfig: {
		showConnectors: true,
		primaryColor: '#3b82f6',
		completedColor: '#10b981',
		backgroundColor: '#e5e7eb',
	},
});

reactStepperRegistry.register({
	stepperId: 'minimalist',
	name: 'Minimalist Stepper',
	description: 'Simple text-based navigation',
	component: MinimalistStepper,
	defaultConfig: {
		showProgress: true,
		primaryColor: '#3b82f6',
	},
});

// Register layouts immediately (synchronously)
reactLayoutRegistry.register({
	layoutId: 'split-screen',
	name: 'Split Screen Layout',
	description: 'Display form content alongside additional information or media',
	component: SplitScreenLayout,
	defaultConfig: {
		sidePlacement: 'left',
		sideWidth: '50%',
		backgroundColor: '#f8f9fa',
		sideContent: '<h3>Welcome!</h3><p>Please fill out this form to continue.</p>',
	},
});

reactLayoutRegistry.register({
	layoutId: 'hero-background',
	name: 'Hero Background Layout',
	description: 'Display form content over a background image or video',
	component: HeroBackgroundLayout,
	defaultConfig: {
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		contentWidth: '600px',
		textColor: 'white',
	},
});

reactLayoutRegistry.register({
	layoutId: 'card',
	name: 'Card Layout',
	description: 'Display form content in a centered card',
	component: CardLayout,
	defaultConfig: {
		maxWidth: '500px',
		padding: '2rem',
		backgroundColor: 'white',
		shadowSize: 'medium',
	},
});

// Export a simple flag to confirm setup is complete
export const FORM_REGISTRY_INITIALIZED = true;

// Debug logging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	console.log('=== FORM REGISTRY SETUP ===');
	console.log('Available steppers:', reactStepperRegistry.getRegisteredStepperIds());
	console.log('Available layouts:', reactLayoutRegistry.getRegisteredLayoutIds());
}
