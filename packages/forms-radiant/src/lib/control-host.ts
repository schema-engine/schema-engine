import { onUpdated, prop, RadiantElement } from '@ecopages/radiant';
import { createEventListenerController } from '@ecopages/radiant-ui/controllers';
import { announceControlConnect, registerFieldControl, type FieldControlAdapter } from '@ecopages/radiant-ui/form';
import { emitControlChange, emitControlCommit } from './field-control';

type ControlValidity = ReturnType<NonNullable<FieldControlAdapter['validity']>>;

const VALIDITY_FLAGS = [
	'valueMissing',
	'typeMismatch',
	'patternMismatch',
	'tooLong',
	'tooShort',
	'rangeUnderflow',
	'rangeOverflow',
	'stepMismatch',
	'badInput',
	'customError',
] as const;

const sameControlValue = (a: unknown, b: unknown): boolean =>
	Array.isArray(a) && Array.isArray(b)
		? a.length === b.length && a.every((entry, index) => entry === b[index])
		: a === b;

/**
 * A schema-engine host around one Radiant UI control, holding the value its element declares.
 *
 * @remarks
 * Radiant UI's choice controls keep text (`rui-select` and `rui-combobox` a list of strings, even for a single
 * choice; `rui-radio-group` a string) and its slider a list of numbers, while the form holds the value the
 * element declares: the option's own value, a number stays a number, and a single choice is one value. The host
 * is the one place the two meet, so `rui-form` connects the engine's container as it is: the host exposes the
 * declared `value`, writes it into the control as the control holds it ({@link toControl}) and reads what the
 * user chose back ({@link fromControl}).
 *
 * The control announces a user's change with native `input` (each change) and `change` (commit). The host
 * stops those inner events and dispatches its own on itself after `value` holds the new value, which is what
 * `rui-field` reads. A write to `value` from code (a default, a reset, `setValue`) reaches the control and
 * dispatches nothing. Radiant UI's own ARIA target (`data-rui-aria-target` on the host) is painted from the
 * field's context by each host with `@bindTo(fieldAriaBindings(selector))`, which also marks it as the field's, and the control's native
 * validity is the host's.
 *
 * Register the tag with {@link registerHostControl}, in `wraps` mode.
 */
export abstract class ControlHost<TValue, THeld = unknown> extends RadiantElement {
	@prop({ type: String }) name = '';
	@prop({ type: Boolean, defaultValue: false }) disabled = false;

	/** The value the element declares. */
	abstract get value(): TValue;
	abstract set value(value: TValue);

	/** The tag of the Radiant UI control the host wraps. */
	protected abstract get controlTag(): string;

	/** What the control holds for the declared value. */
	protected abstract toControl(value: TValue): THeld;

	/** The declared value for what the control holds. */
	protected abstract fromControl(held: unknown): TValue;

	constructor() {
		super();
		createEventListenerController(this, {
			getTarget: () => this,
			type: ['input', 'change'],
			listener: (event) => this.relayValueEvent(event),
		});
	}

	protected override onConnected(): void {
		super.onConnected();
		announceControlConnect(this);
	}

	/** The wrapped Radiant UI control, once the host has rendered it. */
	protected get control(): (HTMLElement & { value?: unknown }) | null {
		return this.querySelector(this.controlTag);
	}

	/**
	 * Whether an event from inside the host is the control announcing its value.
	 *
	 * @remarks
	 * Radiant UI's other inner events, such as a combobox's query text, are not the value and pass through. A
	 * group (`rui-radio-group`, `rui-checkbox-group`) announces through its native inputs, so it overrides this.
	 */
	protected isValueEvent(target: Element): boolean {
		return target === this.control;
	}

	/**
	 * What the control's native validity says, as the field reads it from a registered host.
	 *
	 * @remarks A control that is not form-associated has none, so the host reports nothing for it.
	 */
	validity(): ControlValidity {
		const { control } = this;
		if (!control) return undefined;
		const validity: unknown = Reflect.get(control, 'validity');
		if (typeof validity !== 'object' || validity === null) return undefined;
		const valid = Reflect.get(validity, 'valid');
		if (typeof valid !== 'boolean') return undefined;
		const message = Reflect.get(control, 'validationMessage');
		const text = typeof message === 'string' ? message : undefined;
		if (valid) return { valid, message: text };
		return {
			valid,
			type: VALIDITY_FLAGS.find((flag) => Reflect.get(validity, flag) === true) ?? 'customError',
			message: text,
		};
	}

	private relayValueEvent(event: Event): void {
		const { target } = event;
		if (target === this || !(target instanceof Element) || !this.isValueEvent(target)) return;
		event.stopPropagation();
		const held = this.control?.value;
		this.value = this.fromControl(held);
		if (event.type === 'input') emitControlChange(this);
		else emitControlCommit(this);
	}

	@onUpdated(['value'])
	writeControl(): void {
		const control = this.control;
		if (!control) return;
		const next = this.toControl(this.value);
		if (!sameControlValue(control.value, next)) control.value = next;
	}
}

/**
 * What a form host presents, which decides how `rui-field` reads, writes and names it.
 *
 * - `wraps`: the host wraps a Radiant UI control ({@link ControlHost}): `select`, `combobox`, `radio`, `checkbox
 *   group` and `slider`. The host is not form-associated, so `rui-form` posts the submission's values (`submission:
 *   'none'`), and the field reads the host's validity from the control inside.
 * - `owns`: the host renders its own control (`se-phone-input`, `se-input-otp`, `se-masked-input`, `se-drop-zone`). A
 *   form-associated host submits itself (`submission: 'host'`) and holds text, which the field writes as text. A host
 *   with `held: 'files'` holds a list of files in `files` and leaves the name to the file input inside it
 *   (`submission: 'native'`).
 */
export type HostControl = { readonly mode: 'wraps' } | { readonly mode: 'owns'; readonly held?: 'text' | 'files' };

/**
 * Coerces a store value to the string a text control holds.
 *
 * @remarks
 * Strings pass through; numbers, booleans and bigints are stringified. `null`, `undefined` and
 * values with no sensible text form (objects, arrays, symbols, functions) become `''` instead of
 * `'[object Object]'`.
 */
function toControlString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
	return '';
}

/**
 * Registers a form host with `rui-field`, in the {@link HostControl} mode it presents its control in.
 *
 * @remarks
 * The field reads and writes the host's declared value, so a store write (a default, a reset, `setValue`) reaches the
 * control through the host's setter. The one registration every schema-engine host goes through, so the modes differ
 * only in what {@link HostControl} says.
 */
export function registerHostControl(tagName: string, control: HostControl): void {
	if (control.mode === 'wraps') {
		registerFieldControl(tagName, {
			read: (host) => Reflect.get(host, 'value'),
			write: (host, value) => {
				Reflect.set(host, 'value', value);
			},
			validity: (host) => (host instanceof ControlHost ? host.validity() : undefined),
			submission: 'none',
		});
		return;
	}
	if (control.held === 'files') {
		registerFieldControl(tagName, {
			read: (host) => Reflect.get(host, 'files'),
			write: (host, value) => {
				Reflect.set(host, 'files', Array.isArray(value) ? value : []);
			},
			submission: 'native',
		});
		return;
	}
	registerFieldControl(tagName, {
		read: (host) => Reflect.get(host, 'value'),
		write: (host, value) => {
			Reflect.set(host, 'value', toControlString(value));
		},
		submission: 'host',
	});
}
