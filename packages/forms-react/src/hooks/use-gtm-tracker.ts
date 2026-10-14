import { GTMTracker } from '@schema-engine/forms/browser';

/**
 * Helper hook for GTM integration
 */
export function useGTMTracker() {
	return {
		isAvailable: () => GTMTracker.isAvailable(),
		push: (event: string, data?: Record<string, any>) => GTMTracker.push(event, data),
		pushFormEvent: (
			eventType: 'form_mount' | 'form_step_complete' | 'form_submit' | 'form_abandon',
			formData?: Record<string, any>,
			metadata?: Record<string, any>,
		) => GTMTracker.pushFormEvent(eventType, formData, metadata),
		initialize: (containerId: string) => GTMTracker.initialize(containerId),
	};
}
