import './form-input-otp.css';
import { customElement, prop, query } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import {
	emitControlChange,
	fieldControlHostAttributes,
	registerValueControl,
	releaseFieldAria,
} from '@/lib/field-control';
import { FieldGroup } from '../field-group';
import type { InputOTPFieldProps } from './form-input-otp.types';

function sanitizeChar(value: string, pattern: 'numeric' | 'alphanumeric') {
	const char = value.slice(-1);
	if (pattern === 'numeric') {
		return /^\d$/.test(char) ? char : '';
	}
	return /^[a-zA-Z0-9]$/.test(char) ? char : '';
}

@customElement('se-input-otp', { hostAttributes: fieldControlHostAttributes('[data-ref="group"]') })
export class SeInputOtp extends FormAssociatedElement {
	@prop({ type: String }) value = '';
	@prop({ type: Number, defaultValue: 6 }) length = 6;
	@prop({ type: String, defaultValue: 'numeric' }) pattern: 'numeric' | 'alphanumeric' = 'numeric';

	@query({ ref: 'slot', all: true }) slotInputs!: HTMLInputElement[];

	protected override formValue(): FormValue {
		return this.value;
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = typeof state === 'string' ? state : '';
	}

	protected override onConnected(): void {
		releaseFieldAria(this);
	}

	private readonly onSlotInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		const index = this.slotInputs.indexOf(input);
		const char = sanitizeChar(input.value, this.pattern);
		input.value = char;

		const chars = this.value.padEnd(this.length, ' ').split('').slice(0, this.length);
		chars[index] = char || ' ';
		this.value = chars.join('').replace(/ +$/g, '').replace(/ /g, '');

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
		const text = pasteEvent.clipboardData?.getData('text') ?? '';
		this.value = text
			.split('')
			.map((char) => sanitizeChar(char, this.pattern))
			.filter(Boolean)
			.slice(0, this.length)
			.join('');
		emitControlChange(this, this.value);
	};

	override render(): JsxRenderable {
		const length = this.length || 6;
		const firstHalf = Math.ceil(length / 2);
		const chars = this.value.split('');

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
						maxlength={1}
						inputmode={this.pattern === 'numeric' ? 'numeric' : 'text'}
						autocomplete={index === 0 ? 'one-time-code' : 'off'}
						disabled={this.effectiveDisabled}
						on:input={this.onSlotInput}
						on:keydown={this.onSlotKeydown}
						on:paste={this.onSlotPaste}
						prop:value={chars[index] ?? ''}
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
