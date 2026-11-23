import { selectValue, type FormStateContainer, type FormStateSnapshot } from '@schema-engine/forms/state-container';
import { logger } from '@/lib/logger';
import {
	controlMatches,
	isNativeControl,
	readControl,
	readNativeFact,
	sameValue,
	writeControl,
	type NativeControl,
} from './native-control';

/**
 * Who owns the value of a control. An uncontrolled control keeps its own value, which the registry reads and
 * writes back, and `rendered` is the value React gave it when the field rendered. A controlled control is
 * rendered by a component from the container's value, and the registry only reads its validity.
 */
export type FieldBinding =
	{ readonly mode: 'controlled' } | { readonly mode: 'uncontrolled'; readonly rendered: unknown };

/**
 * The controls of a form by field path, which `setFocus` and a failed submit move focus to, and the only
 * module that reads a native control, writes it back and reports what the browser says about it.
 */
export interface FieldRegistry {
	/**
	 * Records a control of `path`; returns the function that removes that control.
	 *
	 * @remarks
	 * An uncontrolled native control that differs from the value React rendered it with was changed by the
	 * user before the form hydrated, so the container takes what it shows. One that still shows what React
	 * rendered takes the container's value instead, which is newer when the control is a new element of a
	 * field that has been edited since. Every native control reports its validity on attach and withdraws it
	 * when it leaves, unless another control of the path remains.
	 */
	register(path: string, element: HTMLElement, binding: FieldBinding): () => void;
	/** Writes what the user did to `element` into the container and reports its validity. */
	change(path: string, element: HTMLElement): void;
	/** Reports the validity of the controls of `path`, then marks the path blurred. */
	blur(path: string): void;
	/** Reports the validity of the native controls of `path`. */
	reportNative(path: string): void;
	/** Whether something is registered for `path`, and whether any of it is an input, select or textarea. */
	inspect(path: string): { registered: boolean; native: boolean };
	focus(path: string): void;
	/** Focuses the first control, in document order, of the fields at `paths` or below them, so an error on an array reaches its rows. */
	focusFirst(paths: readonly string[]): void;
	/** Focuses the first control, in document order, of the field at `path` or below it. */
	focusWithin(path: string): void;
}

interface Registration {
	readonly element: HTMLElement;
	readonly binding: FieldBinding;
}

function focusFirstInDocument(elements: readonly HTMLElement[]): void {
	elements
		.filter((element) => element.isConnected)
		.reduce<HTMLElement | undefined>(
			(first, element) =>
				first && !(first.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) ? first : element,
			undefined,
		)
		?.focus();
}

function nativeControls(registrations: readonly Registration[]): NativeControl[] {
	return registrations.map(({ element }) => element).filter(isNativeControl);
}

/** The arrays whose rows were added, removed or moved between two snapshots. */
function reshapedArrays(before: FormStateSnapshot['rowIds'], after: FormStateSnapshot['rowIds']): string[] {
	return Object.keys({ ...before, ...after }).filter((array) => before[array] !== after[array]);
}

/** The fact of a control, or none when the browser throws while it is read: the others are still reported. */
function readFactSafely(control: NativeControl, path: string) {
	try {
		return readNativeFact(control);
	} catch (error) {
		logger.error(`Could not read the validity of "${path}":`, error);
		return null;
	}
}

/**
 * @remarks
 * A path can have several controls at once: a radio group or a list of checkboxes shares one path, and a
 * row that is replaced has the old control beside the new one until it unmounts. The latest registered one
 * that is still mounted answers for `focus`.
 *
 * One subscription to the container serves every control. On a change it compares each registered
 * uncontrolled path with what its controls show and writes back only the difference, so a control that
 * echoes the user's own change is never touched: that is what keeps the cursor, an IME composition and the
 * text of a number input with `badInput` where they are. A change that adds, removes or moves the rows of
 * an array is not written back below that array: the rows' controls keep their text and register again
 * under their new paths, where they already agree with the container, and writing the old paths would put
 * one row's text into another's control.
 */
export function createFieldRegistry(container: FormStateContainer): FieldRegistry {
	const controls = new Map<string, Registration[]>();
	let unsubscribe: (() => void) | undefined;
	let lastRowIds = container.getSnapshot().rowIds;

	const current = (path: string): HTMLElement | undefined => controls.get(path)?.at(-1)?.element;
	const within = (path: string): HTMLElement[] =>
		Array.from(controls.keys())
			.filter((key) => key === path || key.startsWith(`${path}.`))
			.flatMap((key) => current(key) ?? []);

	const reportNative = (path: string): void => {
		const natives = nativeControls(controls.get(path) ?? []);
		if (natives.length === 0) return;
		const fact = natives.map((control) => readFactSafely(control, path)).find((candidate) => candidate !== null);
		container.reportNative({ [path]: fact ?? null });
	};

	const writeBack = (): void => {
		const snapshot = container.getSnapshot();
		const reshaped = reshapedArrays(lastRowIds, snapshot.rowIds);
		lastRowIds = snapshot.rowIds;
		for (const [path, registrations] of Array.from(controls)) {
			if (reshaped.some((array) => path.startsWith(`${array}.`))) continue;
			const natives = nativeControls(registrations.filter(({ binding }) => binding.mode === 'uncontrolled'));
			const value = selectValue(snapshot, path);
			const stale = natives.filter((control) => !controlMatches(control, value));
			if (stale.length === 0) continue;
			for (const control of stale) writeControl(control, value);
			reportNative(path);
		}
	};

	const settle = (path: string, control: NativeControl, rendered: unknown): void => {
		const value = selectValue(container.getSnapshot(), path);
		if (controlMatches(control, value)) return;
		if (controlMatches(control, rendered)) {
			writeControl(control, value);
			return;
		}
		const read = readControl(control, value);
		if (!sameValue(read, value)) container.setValue(path, read);
	};

	return {
		register(path, element, binding) {
			const registration: Registration = { element, binding };
			controls.set(path, [...(controls.get(path) ?? []), registration]);
			if (!unsubscribe) {
				lastRowIds = container.getSnapshot().rowIds;
				unsubscribe = container.subscribe(writeBack);
			}
			if (binding.mode === 'uncontrolled' && isNativeControl(element)) settle(path, element, binding.rendered);
			reportNative(path);
			return () => {
				const remaining = (controls.get(path) ?? []).filter((control) => control !== registration);
				if (remaining.length > 0) controls.set(path, remaining);
				else controls.delete(path);
				if (controls.size === 0) {
					unsubscribe?.();
					unsubscribe = undefined;
				}
				if (!isNativeControl(element)) return;
				if (nativeControls(remaining).length > 0) reportNative(path);
				else container.reportNative({ [path]: null });
			};
		},
		change(path, element) {
			if (!isNativeControl(element)) return;
			container.setValue(path, readControl(element, selectValue(container.getSnapshot(), path)));
			reportNative(path);
		},
		blur(path) {
			reportNative(path);
			container.blur(path);
		},
		reportNative,
		inspect(path) {
			const registrations = controls.get(path) ?? [];
			return { registered: registrations.length > 0, native: nativeControls(registrations).length > 0 };
		},
		focus(path) {
			current(path)?.focus();
		},
		focusFirst(paths) {
			focusFirstInDocument(paths.flatMap(within));
		},
		focusWithin(path) {
			focusFirstInDocument(within(path));
		},
	};
}
