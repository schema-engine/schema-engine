/**
 * Google Tag Manager integration for form analytics
 * Handles GTM event tracking with isomorphic app compatibility
 */
export class GTMTracker {
	/**
	 * Check if GTM is available in the current environment
	 */
	static isAvailable(): boolean {
		return typeof window !== 'undefined' && Array.isArray((window as any).dataLayer);
	}

	/**
	 * Push an event to GTM dataLayer
	 * @param event - GTM event name
	 * @param data - Event data payload
	 */
	static push(event: string, data: Record<string, any> = {}): void {
		if (typeof window === 'undefined') {
			// Server-side rendering - log for debugging
			console.log('[GTM] Server-side event (not sent):', event, data);
			return;
		}

		if (!(window as any).dataLayer) {
			(window as any).dataLayer = [];
		}

		const eventData = {
			event,
			...data,
			timestamp: new Date().toISOString(),
		};

		try {
			(window as any).dataLayer.push(eventData);
			console.log('[GTM] Event pushed:', eventData);
		} catch (error) {
			console.error('[GTM] Failed to push event:', error);
		}
	}

	/**
	 * Push form-specific events with standardized structure
	 * @param eventType - Type of form event
	 * @param formData - Current form data
	 * @param metadata - Additional event metadata
	 */
	static pushFormEvent(
		eventType: 'form_mount' | 'form_step_complete' | 'form_submit' | 'form_abandon',
		formData?: Record<string, any>,
		metadata?: Record<string, any>,
	): void {
		const data: Record<string, any> = {
			form_event_type: eventType,
			...metadata,
		};

		if (formData && eventType !== 'form_abandon') {
			const filteredData = Object.fromEntries(
				Object.entries(formData).filter(
					([key]) =>
						!key.toLowerCase().includes('password') &&
						!key.toLowerCase().includes('ssn') &&
						!key.toLowerCase().includes('credit'),
				),
			);
			data.form_data = filteredData;
		}

		GTMTracker.push(eventType, data);
	}

	/**
	 * Initialize GTM with container ID
	 * @param containerId - GTM container ID (e.g., 'GTM-XXXXXXX')
	 */
	static initialize(containerId: string): void {
		if (typeof window === 'undefined') {
			console.log('[GTM] Server-side - skipping initialization');
			return;
		}

		if (GTMTracker.isAvailable()) {
			console.log('[GTM] Already initialized');
			return;
		}

		try {
			(window as any).dataLayer = (window as any).dataLayer || [];
			GTMTracker.push('gtm.js', { 'gtm.start': Date.now(), containerId });
		} catch (error) {
			console.error('[GTM] Initialization failed:', error);
		}
	}
}
