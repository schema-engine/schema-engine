import { GDPRConsent } from '@json-form-engine/core/tools/gdpr-consent';

/**
 * Helper hook for GDPR consent management
 */
export function useGDPRConsent() {
	return {
		hasConsent: () => GDPRConsent.hasConsent(),
		grantConsent: () => GDPRConsent.grantConsent(),
		revokeConsent: () => GDPRConsent.revokeConsent(),
		needsUpdate: () => GDPRConsent.needsConsentUpdate(),
		getConsent: () => GDPRConsent.getConsent(),
	};
}
