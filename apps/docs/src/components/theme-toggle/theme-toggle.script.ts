import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { customElement, onEvent } from '@ecopages/radiant';
import { RuiCycleToggleElement, type RuiCycleToggleProps } from '@ecopages/radiant-ui/cycle-toggle';
import {
	THEME_CHANGE_EVENT,
	THEME_STORAGE_KEY,
	DARK_THEME_QUERY,
	applyDocumentTheme,
	normalizePreference,
	resolveIsDark,
	type ThemePreference,
} from '@/lib/theme';

type ThemeChangeDetail = {
	theme: ThemePreference;
	isDark: boolean;
};

const THEME_TOGGLE_TAG = 'theme-toggle';

/**
 * @remarks
 * Persists `system` / `light` / `dark` in `localStorage`, mirrors `prefers-color-scheme`
 * while `system` is selected, and broadcasts `eco:theme-change` so remounted toggles stay in sync.
 */
@customElement(THEME_TOGGLE_TAG)
export class ThemeToggle extends RuiCycleToggleElement {
	/**
	 * @remarks
	 * First-connect attribute catch-up is deferred to a microtask. Applying the
	 * stored preference synchronously would run first, then catch-up would
	 * overwrite `value` with the SSR attribute.
	 */
	protected override onConnected(): void {
		this.syncWithStoredPreference();
	}

	@onEvent({ mediaQuery: DARK_THEME_QUERY, type: 'change' })
	onSystemThemeChange() {
		if (normalizePreference(this.value) !== 'system') return;
		this.applyEffectiveTheme();
	}

	@onEvent({ selector: THEME_TOGGLE_TAG, type: 'rui-change' })
	onCycleChange() {
		this.handlePreferenceChange();
	}

	@onEvent({ window: true, type: THEME_CHANGE_EVENT })
	onThemeChange(event: CustomEvent<ThemeChangeDetail>) {
		const { theme } = event.detail;
		const preference = normalizePreference(theme);
		if (normalizePreference(this.value) !== preference) {
			this.value = preference;
			this.resync();
		}
	}

	private handlePreferenceChange() {
		const preference = normalizePreference(this.value);
		localStorage.setItem(THEME_STORAGE_KEY, preference);
		this.applyEffectiveTheme();
		window.dispatchEvent(
			new CustomEvent<ThemeChangeDetail>(THEME_CHANGE_EVENT, {
				detail: { theme: preference, isDark: resolveIsDark(preference) },
			}),
		);
	}

	private syncWithStoredPreference() {
		const preference = normalizePreference(localStorage.getItem(THEME_STORAGE_KEY));
		this.value = preference;
		this.resync();
		this.applyEffectiveTheme();
	}

	private applyEffectiveTheme() {
		applyDocumentTheme(normalizePreference(this.value));
	}
}

export type ThemeToggleProps = RuiCycleToggleProps & { id?: string };

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'theme-toggle': JsxCustomElementAttributes<ThemeToggle, ThemeToggleProps>;
	}
}
