import type { FormConfig } from '@schema-engine/forms';
import { theme } from '@/lib/examples/theming/theme';

/**
 * The axes the playground offers, in the order of its controls, and the element of the config that carries each pick.
 *
 * @remarks
 * `form` picks go on the `appearance` of the form, which reaches every field. `shell` picks go on the `appearance` of the
 * card shell, which is where `config.ts` puts `size` and `surface`.
 */
export const PLAYGROUND_AXES = [
	{ axis: 'tone', target: 'form' },
	{ axis: 'shape', target: 'form' },
	{ axis: 'font', target: 'form' },
	{ axis: 'size', target: 'shell' },
	{ axis: 'surface', target: 'shell' },
] as const;

/** The name of an axis the playground offers. */
export type PlaygroundAxis = (typeof PLAYGROUND_AXES)[number]['axis'];

/** One value of every axis the playground offers. */
export type Picks = Readonly<Record<PlaygroundAxis, string>>;

/** One axis as the playground draws from it: its label and the values it offers, read from the theme. */
export interface PlaygroundControl {
	readonly axis: PlaygroundAxis;
	readonly label: string;
	readonly values: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function axisOf(axis: PlaygroundAxis) {
	const registration = theme.appearance.get(axis);
	if (!registration) throw new Error(`The theme declares no '${axis}' axis.`);
	return registration;
}

/** The axes of the playground, from the shared theme, so a value added to an axis can be drawn. */
export function getPlaygroundControls(): readonly PlaygroundControl[] {
	return PLAYGROUND_AXES.map(({ axis }) => {
		const registration = axisOf(axis);
		return { axis, label: registration.metadata.name, values: Object.keys(registration.values) };
	});
}

/** The picks as one line a reader can scan, such as `Tone brand, Shape rounded, Font sans, Size compact, Surface outlined`. */
export function describePicks(picks: Picks): string {
	return getPlaygroundControls()
		.map(({ axis, label }) => `${label} ${picks[axis]}`)
		.join(', ');
}

function shellAppearance(config: FormConfig): Record<string, unknown> {
	const shell = config.view?.shell;
	return isRecord(shell) && isRecord(shell.appearance) ? shell.appearance : {};
}

/**
 * The picks a config makes, with the default of the axis for one it leaves out.
 *
 * @remarks A value the theme does not list for its axis is read as no pick.
 */
export function readPicks(config: FormConfig): Picks {
	const form: Record<string, unknown> = config.appearance ?? {};
	const shell = shellAppearance(config);
	const picks: Record<string, string> = {};
	for (const { axis, target } of PLAYGROUND_AXES) {
		const registration = axisOf(axis);
		const authored = (target === 'form' ? form : shell)[axis];
		picks[axis] =
			typeof authored === 'string' && Object.hasOwn(registration.values, authored)
				? authored
				: registration.default;
	}
	return picks as Picks;
}

/**
 * The config with the picks laid over it: the form-level axes on the form, the shell axes on the card shell.
 *
 * @remarks Pure: the config it is given is not changed, and everything the picks do not name stays as it was.
 */
export function applyPicks(config: FormConfig, picks: Picks): FormConfig {
	const form: Record<string, string> = {};
	const shell: Record<string, string> = {};
	for (const { axis, target } of PLAYGROUND_AXES) (target === 'form' ? form : shell)[axis] = picks[axis];
	return {
		...config,
		appearance: { ...config.appearance, ...form },
		view: {
			...config.view,
			$type: config.view?.$type ?? 'card',
			shell: {
				...(isRecord(config.view?.shell) ? config.view.shell : {}),
				appearance: { ...shellAppearance(config), ...shell },
			},
		},
	};
}

function sample<T>(values: readonly T[], random: () => number): T {
	return values[Math.min(values.length - 1, Math.floor(random() * values.length))]!;
}

/**
 * A random value of every axis that is never the combination it was given.
 *
 * @param random - Returns a number in `[0, 1)`; `Math.random` unless a test supplies its own.
 * @remarks
 * Every axis is picked at random. When the draw is the combination it started from, one axis moves to another of its
 * values, so the call never loops and never returns the same picks.
 */
export function shufflePicks(current: Picks, random: () => number = Math.random): Picks {
	const controls = getPlaygroundControls();
	const next: Record<string, string> = {};
	for (const { axis, values } of controls) next[axis] = sample(values, random);
	if (controls.every(({ axis }) => next[axis] === current[axis])) {
		const { axis, values } = sample(
			controls.filter((control) => control.values.length > 1),
			random,
		);
		next[axis] = sample(
			values.filter((value) => value !== current[axis]),
			random,
		);
	}
	return next as Picks;
}
