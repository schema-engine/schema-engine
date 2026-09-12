import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bashGrammar from 'shiki/langs/bash.mjs';
import tsGrammar from 'shiki/langs/typescript.mjs';
import tsxGrammar from 'shiki/langs/tsx.mjs';
import darkPlusTheme from 'shiki/themes/dark-plus.mjs';
import lightPlusTheme from 'shiki/themes/light-plus.mjs';

/** Languages the shared synchronous highlighter has registered. */
export type SyncHighlightLanguage = 'ts' | 'tsx' | 'typescript' | 'bash';

let highlighter: ReturnType<typeof createHighlighterCoreSync> | undefined;

/**
 * Synchronous Shiki highlighter shared by docs code blocks.
 *
 * @remarks
 * The ECO JSX renderer calls component functions while the JSX tree is built,
 * so an async component's Promise serializes as `[object Promise]`. This
 * highlights with the JavaScript regex engine at call time instead, keeping
 * `codeToHtml` synchronous without WASM.
 */
export function codeToHtmlSync(code: string, lang: SyncHighlightLanguage): string {
	highlighter ??= createHighlighterCoreSync({
		themes: [lightPlusTheme, darkPlusTheme],
		langs: [tsGrammar, tsxGrammar, bashGrammar],
		engine: createJavaScriptRegexEngine(),
	});
	return highlighter.codeToHtml(code, {
		lang,
		themes: { light: 'light-plus', dark: 'dark-plus' },
		defaultColor: false,
	});
}
