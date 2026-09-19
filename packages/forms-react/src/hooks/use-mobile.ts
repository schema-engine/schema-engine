import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onStoreChange: () => void) {
	const query = window.matchMedia(MOBILE_QUERY);
	query.addEventListener('change', onStoreChange);
	return () => query.removeEventListener('change', onStoreChange);
}

/**
 * Whether the viewport is narrower than the mobile breakpoint.
 *
 * @remarks
 * Subscribes to `matchMedia` as an external store, so the first client render
 * already has the real value instead of flashing `false` through an effect.
 * Server and hydration renders report `false`.
 */
export function useIsMobile(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(MOBILE_QUERY).matches,
		() => false,
	);
}
