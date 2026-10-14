import { logger } from '@/lib/logger';

interface GTMEvent extends Record<string, unknown> {
	event: string;
	timestamp: string;
}

interface GTMWindow extends Window {
	dataLayer?: GTMEvent[];
}

function getWindow(): GTMWindow | undefined {
	return typeof window === 'undefined' ? undefined : (window as GTMWindow);
}

/** Pushes form analytics events to the browser's Google Tag Manager data layer. */
export class GTMTracker {
	static isAvailable(): boolean {
		return Array.isArray(getWindow()?.dataLayer);
	}

	static push(event: string, data: Record<string, unknown> = {}): void {
		const browserWindow = getWindow();
		if (!browserWindow) {
			logger.debug('Skipped GTM event because no browser window is available', { event, data });
			return;
		}

		browserWindow.dataLayer ??= [];
		const eventData: GTMEvent = { event, ...data, timestamp: new Date().toISOString() };

		try {
			browserWindow.dataLayer.push(eventData);
			logger.debug('Pushed GTM event', { eventData });
		} catch (error) {
			logger.error('Failed to push GTM event', { error, eventData });
		}
	}

	static pushFormEvent(
		eventType: 'form_mount' | 'form_step_complete' | 'form_submit' | 'form_abandon',
		formData?: Record<string, unknown>,
		metadata?: Record<string, unknown>,
	): void {
		const data: Record<string, unknown> = { form_event_type: eventType, ...metadata };

		if (formData && eventType !== 'form_abandon') {
			data.form_data = Object.fromEntries(
				Object.entries(formData).filter(
					([key]) =>
						!key.toLowerCase().includes('password') &&
						!key.toLowerCase().includes('ssn') &&
						!key.toLowerCase().includes('credit'),
				),
			);
		}

		GTMTracker.push(eventType, data);
	}

	static initialize(containerId: string): void {
		const browserWindow = getWindow();
		if (!browserWindow) {
			logger.debug('Skipped GTM initialization because no browser window is available');
			return;
		}

		if (GTMTracker.isAvailable()) {
			logger.debug('GTM is already initialized');
			return;
		}

		try {
			browserWindow.dataLayer ??= [];
			GTMTracker.push('gtm.js', { 'gtm.start': Date.now(), containerId });
		} catch (error) {
			logger.error('Failed to initialize GTM', { error, containerId });
		}
	}
}
