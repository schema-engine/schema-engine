export const THEME_STORAGE_KEY = 'theme';
export const DARK_THEME_QUERY = '(prefers-color-scheme: dark)';
export const THEME_CHANGE_EVENT = 'eco:theme-change';

export type ThemePreference = 'system' | 'light' | 'dark';

export function normalizePreference(stored: string | null): ThemePreference {
	if (stored === 'light' || stored === 'dark' || stored === 'system') {
		return stored;
	}

	return 'system';
}

export function resolveIsDark(
	preference: ThemePreference,
	matchesDark = typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia(DARK_THEME_QUERY).matches,
): boolean {
	if (preference === 'dark') {
		return true;
	}

	if (preference === 'light') {
		return false;
	}

	return matchesDark;
}

export function applyDocumentTheme(preference: ThemePreference): void {
	const isDark = resolveIsDark(preference);
	document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
	document.documentElement.classList.toggle('dark', isDark);
}

/** Blocking FOUC script — same contract as `applyDocumentTheme`. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var s=localStorage.getItem('${THEME_STORAGE_KEY}');var p=s==='light'||s==='dark'||s==='system'?s:'system';var d=p==='dark'||(p!=='light'&&window.matchMedia('${DARK_THEME_QUERY}').matches);var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.classList.toggle('dark',d)})();`;
