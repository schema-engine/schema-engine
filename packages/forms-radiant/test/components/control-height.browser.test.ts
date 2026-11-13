import '@ecopages/radiant/client/install-hydrator';
import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@/styles/appearance.css';
import { getByRole } from '@testing-library/dom';
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
	controlHeightHookAcceptance,
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

describe('a size hook set on the form class', () => {
	const author = document.createElement('style');
	beforeAll(() => {
		author.textContent = '.tight-controls { --se-control-height-compact: 18px; }';
		document.head.append(author);
	});
	afterAll(() => author.remove());

	const formWith = (stepSize?: string, fieldSize?: string) => ({
		...controlHeightForm(undefined, stepSize),
		className: 'tight-controls',
		steps: [
			{
				id: 'main',
				title: 'Main',
				appearance: stepSize ? { size: stepSize } : undefined,
				elements: [
					{
						$type: 'input',
						id: 'email',
						name: 'email',
						label: 'Email',
						appearance: fieldSize ? { size: fieldSize } : undefined,
					},
					{ $type: 'submit', id: 'submit', name: 'controlHeightSubmit', label: 'Send' },
				],
			},
		],
	});

	test('reaches a pick on a step, which sits below the grids that carry the theme', async () => {
		const { host, cleanup } = await mountRadiant({ config: formWith('compact') });
		try {
			expect(readControlHeights(host)).toEqual({ input: 18, button: 18 });
		} finally {
			cleanup();
		}
	});

	test('reaches a pick on a field', async () => {
		const { host, cleanup } = await mountRadiant({ config: formWith(undefined, 'compact') });
		try {
			expect(readControlHeights(host).input).toBe(18);
		} finally {
			cleanup();
		}
	});
});

describe('a size hook set above the form', () => {
	controlHeightHookAcceptance(mountRadiant);

	const withRootHook = async (run: () => Promise<void>) => {
		document.documentElement.style.setProperty('--se-control-height-compact', '18px');
		try {
			await run();
		} finally {
			document.documentElement.style.removeProperty('--se-control-height-compact');
		}
	};

	test('outranks a theme scoped to a wrapper', async () => {
		await withRootHook(async () => {
			const scoped = mountIn({
				'--size-control-sm': '22px',
				'--size-control-md': '30px',
				'--size-control-lg': '40px',
			});
			const { host, cleanup } = await scoped({ config: controlHeightForm('compact') });
			try {
				expect(readControlHeights(host)).toEqual({ input: 18, button: 18 });
			} finally {
				cleanup();
			}
		});
	});

	test('keeps a scoped theme for the pick the hook does not name', async () => {
		await withRootHook(async () => {
			const scoped = mountIn({
				'--size-control-sm': '22px',
				'--size-control-md': '30px',
				'--size-control-lg': '40px',
			});
			const { host, cleanup } = await scoped({ config: controlHeightForm('comfortable') });
			try {
				expect(readControlHeights(host)).toEqual({ input: 40, button: 40 });
			} finally {
				cleanup();
			}
		});
	});

	test('a form class beats a hook set above it', async () => {
		const author = document.createElement('style');
		author.textContent = '.local-controls { --se-control-height-compact: 26px; }';
		document.head.append(author);
		try {
			await withRootHook(async () => {
				const { host, cleanup } = await mountRadiant({
					config: { ...controlHeightForm('compact'), className: 'local-controls' },
				});
				try {
					expect(readControlHeights(host)).toEqual({ input: 26, button: 26 });
				} finally {
					cleanup();
				}
			});
		} finally {
			author.remove();
		}
	});

	test('a wrapper hook reaches a form nested below it, ahead of the theme wrapper of that form', async () => {
		const { host, cleanup } = await mountRadiant({ config: controlHeightForm() });
		const outer = document.createElement('div');
		outer.style.setProperty('--se-control-height-compact', '19px');
		const wrapper = document.createElement('div');
		wrapper.style.setProperty('--size-control-sm', '40px');
		outer.append(wrapper);
		host.querySelector('.se-grid-item')!.append(outer);
		const root = createRoot(wrapper);
		root.render(
			FormRenderer({
				config: engine.validateForm({
					id: 'nested-hook',
					appearance: { size: 'compact' },
					steps: [
						{
							id: 'nested',
							title: 'Nested',
							elements: [{ $type: 'input', id: 'other', name: 'other', label: 'Other' }],
						},
					],
				}),
				engine,
			}),
		);
		const nested = new FormController(wrapper.querySelector('rui-form')!);
		try {
			await expect.poll(() => nested.ready).toBe(true);
			expect(getByRole(wrapper, 'textbox', { name: 'Other' }).getBoundingClientRect().height).toBe(19);
		} finally {
			nested.disconnect();
			root.unmount();
			cleanup();
		}
	});

	test('a spacing hook on the root element reaches the spacing of a compact form', async () => {
		const spacing = async () => {
			const { host, cleanup } = await mountRadiant({ config: controlHeightForm('compact') });
			try {
				return getComputedStyle(host.querySelector('rui-form')!).getPropertyValue('--se-space').trim();
			} finally {
				cleanup();
			}
		};
		const themed = await spacing();
		expect(themed).not.toBe('');
		document.documentElement.style.setProperty('--se-space-compact', '0.3125rem');
		try {
			expect(await spacing()).toBe('0.3125rem');
		} finally {
			document.documentElement.style.removeProperty('--se-space-compact');
		}
	});
});

describe('a form nested in a grid item of another theme', () => {
	test('takes its host control height from the wrapper it sits in', async () => {
		const { host, cleanup } = await mountRadiant({ config: controlHeightForm() });
		const wrapper = document.createElement('div');
		wrapper.style.setProperty('--size-control-sm', '40px');
		host.querySelector('.se-grid-item')!.append(wrapper);
		const root = createRoot(wrapper);
		const compactForm = {
			id: 'nested-control-height',
			appearance: { size: 'compact' },
			steps: [
				{
					id: 'nested',
					title: 'Nested',
					elements: [
						{ $type: 'input', id: 'other', name: 'other', label: 'Other' },
						{ $type: 'submit', id: 'go', name: 'nestedSubmit', label: 'Go' },
					],
				},
			],
		};
		root.render(FormRenderer({ config: engine.validateForm(compactForm), engine }));
		const nested = new FormController(wrapper.querySelector('rui-form')!);
		try {
			await expect.poll(() => nested.ready).toBe(true);
			expect(getByRole(wrapper, 'textbox', { name: 'Other' }).getBoundingClientRect().height).toBe(40);
			expect(getByRole(wrapper, 'button', { name: 'Go' }).getBoundingClientRect().height).toBe(40);
		} finally {
			nested.disconnect();
			root.unmount();
			cleanup();
		}
	});
});
