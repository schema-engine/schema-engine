import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bashGrammar from 'shiki/langs/bash.mjs';
import cssGrammar from 'shiki/langs/css.mjs';
import jsonGrammar from 'shiki/langs/json.mjs';
import yamlGrammar from 'shiki/langs/yaml.mjs';
import tsGrammar from 'shiki/langs/typescript.mjs';
import tsxGrammar from 'shiki/langs/tsx.mjs';
import darkPlusTheme from 'shiki/themes/dark-plus.mjs';
import lightPlusTheme from 'shiki/themes/light-plus.mjs';
import { DOCS_SHIKI_THEMES } from '@/mdx/shiki-themes';

/** Languages the shared synchronous highlighter has registered. */
export type SyncHighlightLanguage = 'ts' | 'tsx' | 'typescript' | 'bash' | 'json' | 'css' | 'yaml';

const SYNC_HIGHLIGHTER_KEY = Symbol.for('@schema-engine/docs.sync-highlighter');

type GlobalWithSyncHighlighter = typeof globalThis & {
	[SYNC_HIGHLIGHTER_KEY]?: ReturnType<typeof createHighlighterCoreSync>;
};

function getHighlighter(): ReturnType<typeof createHighlighterCoreSync> {
	const target = globalThis as GlobalWithSyncHighlighter;
	target[SYNC_HIGHLIGHTER_KEY] ??= createHighlighterCoreSync({
		themes: [lightPlusTheme, darkPlusTheme],
		langs: [tsGrammar, tsxGrammar, bashGrammar, jsonGrammar, cssGrammar, yamlGrammar],
		engine: createJavaScriptRegexEngine(),
	});
	return target[SYNC_HIGHLIGHTER_KEY];
}

/**
 * Synchronous Shiki highlighter shared by docs code blocks.
 *
 * @remarks
 * The ECO JSX renderer calls component functions while the JSX tree is built,
 * so an async component's Promise serializes as `[object Promise]`. This
 * highlights with the JavaScript regex engine at call time instead, keeping
 * `codeToHtml` synchronous without WASM.
 *
 * The instance is cached on `globalThis` so page modules evaluated across the
 * dev server reuse a single highlighter instance instead of re-instantiating.
 */
export function codeToHtmlSync(code: string, lang: SyncHighlightLanguage): string {
	const highlighter = getHighlighter();
	return highlighter.codeToHtml(code, {
		lang,
		themes: DOCS_SHIKI_THEMES,
		defaultColor: false,
	});
}
