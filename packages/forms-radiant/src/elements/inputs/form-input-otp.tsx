import './form-input-otp.css';
import { prop, query, state } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import {
	emitControlChange,
	fieldControlHostAttributes,
	registerValueControl,
	syncFieldControl,
} from '@/lib/field-control';
import { FieldGroup } from '../field-group';
import type { InputOTPFieldProps } from './form-input-otp.types';
import { formElement } from '@/lib/define-element';

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
@formElement('se-input-otp', { hostAttributes: fieldControlHostAttributes('[data-ref="group"]') })
export class SeInputOtp extends FormAssociatedElement {
	@prop({ type: Number, defaultValue: 6 }) length = 6;
	@prop({ type: String, defaultValue: 'numeric' }) pattern: 'numeric' | 'alphanumeric' = 'numeric';

	@state slots: string[] = [];

	@query({ ref: 'slot', all: true }) slotInputs!: HTMLInputElement[];

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
		syncFieldControl(this);
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

		emitControlChange(this, this.value);
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
		emitControlChange(this, this.value);
	};

	override render(): JsxRenderable {
		const { length } = this;
		const firstHalf = Math.ceil(length / 2);

		return (
			<fieldset class="se-otp" data-ref="group">
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
			description={config.description}
			grid={config.grid}
			style={config.style}
			validation={config}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			{jsx('se-input-otp', {
				name: config.name,
				length: config.length ?? 6,
				pattern: config.pattern ?? 'numeric',
				disabled: config.disabled,
			})}
		</FieldGroup>
	);
}
