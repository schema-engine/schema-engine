import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import compactSpacingCss from '@ecopages/radiant-ui/tokens/spacing/compact?inline';
import wideSpacingCss from '@ecopages/radiant-ui/tokens/spacing/wide?inline';
import softRadiusCss from '@ecopages/radiant-ui/tokens/radius/soft?inline';
import sharpRadiusCss from '@ecopages/radiant-ui/tokens/radius/sharp?inline';

const COLOR_PACKS = ['glacier', 'aurora', 'basalt', 'ember'] as const;
const SPACING_PACKS = ['default', 'compact', 'wide'] as const;
const RADIUS_PACKS = ['default', 'soft', 'sharp'] as const;

const TOKEN_SHEET_ATTR = 'data-rui-storybook-token';

const SPACING_SHEETS = {
	default: null,
	compact: compactSpacingCss,
	wide: wideSpacingCss,
} as const satisfies Record<(typeof SPACING_PACKS)[number], string | null>;

const RADIUS_SHEETS = {
	default: null,
	soft: softRadiusCss,
	sharp: sharpRadiusCss,
} as const satisfies Record<(typeof RADIUS_PACKS)[number], string | null>;

export type DesignTokenGlobals = {
	ruiColors?: string;
	ruiSpacing?: string;
	ruiRadius?: string;
	ruiColorMode?: string;
};

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
	return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Applies an inline token pack synchronously so toolbar changes take effect immediately. */
function syncTokenStylesheet(kind: 'spacing' | 'radius', css: string | null): void {
	const existing = document.head.querySelector<HTMLStyleElement>(`style[${TOKEN_SHEET_ATTR}="${kind}"]`);
	if (!css) {
		existing?.remove();
		return;
	}

	if (existing) {
		if (existing.textContent !== css) existing.textContent = css;
		return;
	}

	const style = document.createElement('style');
	style.setAttribute(TOKEN_SHEET_ATTR, kind);
	style.textContent = css;
	document.head.appendChild(style);
}

/** Syncs the Storybook toolbar selection to the preview document's Radiant UI tokens. */
export function applyDesignTokens(globals: DesignTokenGlobals): void {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	const colors = pick(String(globals.ruiColors ?? 'glacier'), COLOR_PACKS, 'glacier');
	const spacing = pick(String(globals.ruiSpacing ?? 'default'), SPACING_PACKS, 'default');
	const radius = pick(String(globals.ruiRadius ?? 'default'), RADIUS_PACKS, 'default');
	const colorMode = String(globals.ruiColorMode ?? 'light');

	root.dataset.ruiColors = colors;
	root.classList.toggle('dark', colorMode === 'dark');
	syncTokenStylesheet('spacing', SPACING_SHEETS[spacing]);
	syncTokenStylesheet('radius', RADIUS_SHEETS[radius]);
}

/** Keeps the preview document updated when Storybook changes toolbar globals without rerendering. */
export function registerDesignTokenGlobalsSync(): void {
	if (typeof window === 'undefined') return;

	void addons.ready().then(() => {
		const channel = addons.getChannel();
		channel.on(GLOBALS_UPDATED, ({ globals }: { globals?: DesignTokenGlobals }) => {
			applyDesignTokens(globals ?? {});
		});
	});
}
