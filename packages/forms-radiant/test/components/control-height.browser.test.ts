import '@ecopages/radiant/client/install-hydrator';
import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@/styles/appearance.css';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormController } from '@/adapters/radiant/controller';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import type { ConformanceMount } from '../../../../test-utils/renderer-conformance';
import {
	controlHeightAcceptance,
	controlHeightForm,
	readControlHeights,
} from '../../../../test-utils/control-height-acceptance';

const engine = createRadiantFormEngine({ elements: [...schemaFormRegistrations] });

/**
 * The control sizes of an app theme, in the three steps Radiant UI reads.
 *
 * @remarks
 * Radiant UI sizes a control from `--size-control-md` (inputs, selects, the default button) and keeps
 * `--size-control-sm` and `--size-control-lg` for the other steps. The values are far from the
 * renderer-neutral fallbacks, so a pick that ignores the theme shows as the wrong number.
 */
const THEME = { '--size-control-sm': '20px', '--size-control-md': '44px', '--size-control-lg': '60px' };

beforeAll(() => {
	for (const [name, value] of Object.entries(THEME)) document.documentElement.style.setProperty(name, value);
});
afterAll(() => {
	for (const name of Object.keys(THEME)) document.documentElement.style.removeProperty(name);
});

/**
 * Mounts the form the way the conformance suite does, optionally inside a wrapper that sets its own theme variables.
 *
 * @remarks The wrapper is the form's direct parent, which is where a theme scoped to a section of the page sets them.
 */
function mountIn(wrapperTheme?: Record<string, string>): ConformanceMount {
	return async ({ config }) => {
		const host = document.createElement('div');
		for (const [name, value] of Object.entries(wrapperTheme ?? {})) host.style.setProperty(name, value);
		document.body.append(host);
		const root = createRoot(host);
		root.render(FormRenderer({ config: engine.validateForm(config), engine }));
		const form = new FormController(host.querySelector('rui-form')!);
		await expect.poll(() => form.ready).toBe(true);
		return {
			host,
			cleanup: () => {
				form.disconnect();
				root.unmount();
				host.remove();
			},
			update: async () => undefined,
		};
	};
}

const mountRadiant = mountIn();

describe('Radiant controls under a theme that sets the control size', () => {
	controlHeightAcceptance(mountRadiant, {
		unpicked: { input: 44, button: 44 },
		compact: { input: 20, button: 20 },
		comfortable: { input: 60, button: 60 },
	});

	describe('a theme scoped to a wrapper below the root theme', () => {
		controlHeightAcceptance(
			mountIn({ '--size-control-sm': '22px', '--size-control-md': '30px', '--size-control-lg': '40px' }),
			{
				unpicked: { input: 30, button: 30 },
				compact: { input: 22, button: 22 },
				comfortable: { input: 40, button: 40 },
			},
		);
	});

	test('an author class that sets the control size on a field host outranks the pick', async () => {
		const author = document.createElement('style');
		author.textContent = '.author-control-size { --size-control-md: 33px; }';
		document.head.append(author);
		const { host, cleanup } = await mountRadiant({ config: controlHeightForm('compact') });
		try {
			host.querySelector('input')!.closest('.se-form-field')!.classList.add('author-control-size');
			expect(readControlHeights(host).input).toBe(33);
		} finally {
			cleanup();
			author.remove();
		}
	});
});
