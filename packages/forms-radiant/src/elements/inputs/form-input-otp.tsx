import './form-input-otp.css';
import { customElement, prop, state, refAll } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { emitControlChange, emitControlCommit, registerValueControl } from '@/lib/field-control';
import { announceControlConnect } from '@ecopages/radiant-ui/form';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAria, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import { FieldGroup } from '../field-group';
import type { InputOTPFieldProps } from './form-input-otp.types';

function sanitizeChar(value: string, pattern: 'numeric' | 'alphanumeric') {
	const char = value.slice(-1);
	if (pattern === 'numeric') {
		return /^\d$/.test(char) ? char : '';
	}
	return /^[a-zA-Z0-9]$/.test(char) ? char : '';
}

/**
 * @remarks
 * The characters live in `slots`, one entry per slot, so filling or clearing a
 * slot never moves another. `value` is the slots joined, so an incomplete code
 * is a shorter string that a length rule rejects. Writing a value that equals
 * the current one is a no-op, which keeps a store echo from re-spreading a code
 * with gaps from the first slot.
 */
@customElement('se-input-otp', {
	hostAttributes: { 'data-rui-control': '', 'data-rui-aria-target': '[data-ref="group"]' },
})
export class SeInputOtp extends FormAssociatedElement {
	declare readonly [JSX_PROPS]?: Partial<Pick<SeInputOtp, 'name' | 'disabled' | 'length' | 'pattern'>>;

	@prop({ type: Number, defaultValue: 6 }) length = 6;
	@prop({ type: String, defaultValue: 'numeric' }) pattern: 'numeric' | 'alphanumeric' = 'numeric';

	@state protected slots: string[] = [];
	@contextSelector({ context: fieldContext })
	@state
	protected field?: FieldContextValue = undefined;

	@refAll('slot') slotInputs!: HTMLInputElement[];

	/** True while the user has typed since `change` last fired, so leaving the group commits once. */
	private uncommitted = false;

	get value(): string {
		return this.slots.join('');
	}

	set value(next: string) {
		if (next === this.value) {
			return;
		}
		this.fill(next);
	}

	protected override formValue(): FormValue {
		return this.value;
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = typeof state === 'string' ? state : '';
	}

	protected override onConnected(): void {
		announceControlConnect(this);
	}

	private padSlots(chars: readonly string[]) {
		return Array.from({ length: this.length }, (_, index) => chars[index] ?? '');
	}

	private fill(text: string) {
		const chars = text
			.split('')
			.map((char) => sanitizeChar(char, this.pattern))
			.filter(Boolean);
		this.slots = this.padSlots(chars);
	}

	private readonly onSlotInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		const index = this.slotInputs.indexOf(input);
		const char = sanitizeChar(input.value, this.pattern);
		input.value = char;

		const slots = this.padSlots(this.slots);
		slots[index] = char;
		this.slots = slots;

		if (char) {
			this.slotInputs[index + 1]?.focus();
		}

		this.uncommitted = true;
		emitControlChange(this);
	};

	private readonly onGroupFocusOut = (event: Event) => {
		const next = (event as FocusEvent).relatedTarget;
		if (!this.uncommitted || (next instanceof Node && this.contains(next))) {
			return;
		}
		this.uncommitted = false;
		emitControlCommit(this);
	};

	private readonly onSlotKeydown = (event: Event) => {
		const keyEvent = event as KeyboardEvent;
		const input = keyEvent.target as HTMLInputElement;
		if (keyEvent.key !== 'Backspace' || input.value) {
			return;
		}

		this.slotInputs[this.slotInputs.indexOf(input) - 1]?.focus();
	};

	private readonly onSlotPaste = (event: Event) => {
		const pasteEvent = event as ClipboardEvent;
		pasteEvent.preventDefault();
		this.fill(pasteEvent.clipboardData?.getData('text') ?? '');
		this.uncommitted = false;
		emitControlChange(this, { commit: true });
	};

	override render(): JsxRenderable {
		const { length } = this;
		const firstHalf = Math.ceil(length / 2);

		return (
			<fieldset class="se-otp" data-ref="group" on:focusout={this.onGroupFocusOut} {...fieldAria(this.field)}>
				{Array.from({ length }, (_, index) => [
					index === firstHalf ? (
						<span class="se-otp__separator" aria-hidden="true">
							-
						</span>
					) : null,
					<input
						class="rui-input se-otp__slot"
						data-ref="slot"
						aria-label={`Character ${index + 1} of ${length}`}
						maxlength={1}
						inputmode={this.pattern === 'numeric' ? 'numeric' : 'text'}
						autocomplete={index === 0 ? 'one-time-code' : 'off'}
						disabled={this.effectiveDisabled}
						on:input={this.onSlotInput}
						on:keydown={this.onSlotKeydown}
						on:paste={this.onSlotPaste}
						prop:value={this.slots[index] ?? ''}
					/>,
				])}
			</fieldset>
		);
	}
}

registerValueControl('se-input-otp');

export function FormInputOTP(config: InputOTPFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			authoredRequired={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			class={config.className}
			style={config.style}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<SeInputOtp
				name={config.name}
				length={config.length ?? 6}
				pattern={config.pattern ?? 'numeric'}
				disabled={config.disabled}
			/>
		</FieldGroup>
	);
}
