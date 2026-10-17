import './form-input-otp.css';
import { customElement, onEvent, prop, RadiantElement, state } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import type { InputOTPFieldProps } from './form-input-otp.types';

function sanitizeChar(value: string, pattern: 'numeric' | 'alphanumeric') {
	const char = value.slice(-1);
	if (pattern === 'numeric') {
		return /^\d$/.test(char) ? char : '';
	}
	return /^[a-zA-Z0-9]$/.test(char) ? char : '';
}

@customElement('se-input-otp')
export class SeInputOtp extends RadiantElement {
	@prop({ type: String }) name = '';
	@prop({ type: Number, defaultValue: 6 }) length = 6;
	@prop({ type: String, defaultValue: 'numeric' }) pattern: 'numeric' | 'alphanumeric' = 'numeric';
	@prop({ type: Boolean, defaultValue: false }) disabled = false;

	@state value = '';

	@onEvent({ type: 'input', selector: '[data-otp-index]' })
	onSlotInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const index = Number(input.dataset.otpIndex);
		const char = sanitizeChar(input.value, this.pattern);
		input.value = char;

		const chars = this.value.padEnd(this.length, ' ').split('').slice(0, this.length);
		chars[index] = char || ' ';
		this.value = chars.join('').replace(/ +$/g, '').replace(/ /g, '');

		if (char) {
			const next = this.querySelector<HTMLInputElement>(`[data-otp-index="${index + 1}"]`);
			next?.focus();
		}

		this.dispatchChange();
	}

	@onEvent({ type: 'keydown', selector: '[data-otp-index]' })
	onSlotKeydown(event: Event) {
		const keyEvent = event as KeyboardEvent;
		if (keyEvent.key !== 'Backspace') {
			return;
		}

		const input = keyEvent.target as HTMLInputElement;
		const index = Number(input.dataset.otpIndex);
		if (input.value) {
			return;
		}

		const previous = this.querySelector<HTMLInputElement>(`[data-otp-index="${index - 1}"]`);
		previous?.focus();
	}

	@onEvent({ type: 'paste', selector: '[data-otp-index]' })
	onSlotPaste(event: Event) {
		const pasteEvent = event as ClipboardEvent;
		pasteEvent.preventDefault();
		const text = pasteEvent.clipboardData?.getData('text') ?? '';
		const chars = text
			.split('')
			.map((char) => sanitizeChar(char, this.pattern))
			.filter(Boolean)
			.slice(0, this.length);
		this.value = chars.join('');
		this.dispatchChange();
	}

	private dispatchChange() {
		this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: this.value } }));
		const hidden = this.querySelector<HTMLInputElement>('[data-rui-control]');
		if (hidden) {
			hidden.value = this.value;
			hidden.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}

	override render(): JsxRenderable {
		const length = this.length || 6;
		const firstHalf = Math.ceil(length / 2);
		const chars = this.value.split('');

		return (
			<fieldset class="se-otp">
				<input class="se-otp__value" data-rui-control name={this.name} value={this.value} tabindex={-1} />
				{Array.from({ length: firstHalf }, (_, index) => (
					<input
						class="rui-input se-otp__slot"
						data-otp-index={String(index)}
						maxlength={1}
						inputmode={this.pattern === 'numeric' ? 'numeric' : 'text'}
						autocomplete={index === 0 ? 'one-time-code' : 'off'}
						disabled={this.disabled}
						value={chars[index] ?? ''}
					/>
				))}
				<span class="se-otp__separator" aria-hidden="true">
					-
				</span>
				{Array.from({ length: length - firstHalf }, (_, offset) => {
					const index = firstHalf + offset;
					return (
						<input
							class="rui-input se-otp__slot"
							data-otp-index={String(index)}
							maxlength={1}
							inputmode={this.pattern === 'numeric' ? 'numeric' : 'text'}
							autocomplete="off"
							disabled={this.disabled}
							value={chars[index] ?? ''}
						/>
					);
				})}
			</fieldset>
		);
	}
}

export function FormInputOTP({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: InputOTPFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules)}
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
				'on:change': (event: Event) => {
					propsOnChange?.((event as CustomEvent<{ value?: string }>).detail?.value ?? '');
				},
				'on:blur': propsOnBlur,
				'on:focus': propsOnFocus,
			})}
		</FieldGroup>
	);
}
