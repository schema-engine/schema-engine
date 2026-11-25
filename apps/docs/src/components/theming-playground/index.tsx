import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig } from '@schema-engine/forms';
import { RuiAlertIcon } from '@ecopages/radiant-ui/alert';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { FormExampleDemo } from '@/components/form-example-demo';
import { describePicks, readPicks } from './picks';
import './theming-playground.css';

/**
 * The live demos of the themed form, under a note that names the current picks and a Shuffle button inside it.
 *
 * @remarks
 * Shuffle only changes the `appearance` picks of the config: the form-level axes (`tone`, `shape`, `font`) and the ones
 * of the card shell (`size`, `surface`). The theme and the stylesheet stay the same, so the React and the Radiant form,
 * which share one compiled theme, follow together. `theming-playground.script.tsx` renders the new config in each
 * renderer; the server render shows the picks of the config, so the page reads the same without a script.
 *
 * The note wears Radiant UI's inline alert style but is an `<output>`, whose role is `status`, not a `RuiAlert`: `RuiAlert` always
 * stamps `role="alert"`, which is for urgent messages and would interrupt a screen reader on every shuffle.
 *
 * Scoped to the themed form page: it carries its own copy of the config for the script, and no other example demo
 * reads it.
 */
export const ThemingPlayground = eco.component<{ config: FormConfig }, JsxRenderable>({
	dependencies: {
		components: [FormExampleDemo],
		scripts: ['./theming-playground.script.tsx'],
	},
	render: ({ config }) => (
		<div class="theming-playground not-prose unstyled" data-theming-playground={JSON.stringify(config)}>
			<div class="theming-playground__note rui-alert rui-alert--info rui-alert--inline">
				<RuiAlertIcon variant="info" />
				<output class="theming-playground__picks" data-status>
					{describePicks(readPicks(config))}
				</output>
				<RuiButton type="button" variant="outline" size="sm" data-shuffle>
					Shuffle
				</RuiButton>
			</div>
			<FormExampleDemo config={config} />
		</div>
	),
});
