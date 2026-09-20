import './form-masked-input.css';
import { customElement, onUpdated, prop, query, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { FieldGroup } from '../field-group';
import { bindField } from '@/lib/bind-field';
import {
	createPatternMaskOptions,
	getMaskedInputPlaceholder,
	loadIMask,
	parseUnmaskMode,
	readMaskValue,
	type IMaskFactory,
} from '@/lib/mask-options';
import type { MaskedInputFieldProps } from './form-masked-input.types';

@customElement('se-masked-input')
export class SeMaskedInput extends RadiantElement {
	@prop({ type: String }) name = '';
	@prop({ type: String }) inputId = '';
	@prop({ type: String }) mask = '';
	@prop({ type: String }) unmask = '';
	@prop({ type: String }) placeholder = '';
	@prop({ type: String }) autoComplete = '';
	@prop({ type: String }) inputMode = '';
	@prop({ type: String }) placeholderChar = '';
	@prop({ type: String }) defaultValue = '';
	@prop({ type: Boolean, defaultValue: true }) lazy = true;
	@prop({ type: Boolean, defaultValue: false }) overwrite = false;
	@prop({ type: Boolean, defaultValue: false }) autoFocus = false;
	@prop({ type: Boolean, defaultValue: false }) disabled = false;
	@prop({ type: Object }) definitions?: Record<string, string>;

	@query({ ref: 'input' }) input!: HTMLInputElement;
	@query({ ref: 'control' }) control!: HTMLInputElement;

	private maskInstance: ReturnType<IMaskFactory> | null = null;
	private attachGeneration = 0;

	protected override onConnected(): void {
		void this.attachMask();
		this.registerCleanupCallback(() => {
			this.attachGeneration += 1;
			this.destroyMask();
		});
	}

	@onUpdated(['mask', 'unmask', 'lazy', 'overwrite', 'placeholderChar', 'definitions', 'defaultValue'])
	onMaskConfigUpdated(): void {
		void this.attachMask();
	}

	private maskConfig() {
		return createPatternMaskOptions({
			mask: this.mask,
			lazy: this.lazy,
			overwrite: this.overwrite,
			placeholderChar: this.placeholderChar || undefined,
			definitions: this.definitions,
		});
	}

	private async attachMask() {
		if (!this.mask) {
			return;
		}

		const generation = ++this.attachGeneration;
		const IMask = await loadIMask();
		if (generation !== this.attachGeneration || !this.isConnected || !this.input) {
			return;
		}

		if (this.maskInstance) {
			this.maskInstance.updateOptions(this.maskConfig() as never);
			this.syncValue();
			this.setAttribute('data-ready', '');
			return;
		}

		const instance = IMask(this.input, this.maskConfig() as never);
		this.maskInstance = instance;
		if (this.defaultValue) {
			instance.value = this.defaultValue;
		}
		instance.on('accept', () => this.syncValue());
		this.syncValue();
		this.setAttribute('data-ready', '');
	}

	private destroyMask() {
		this.maskInstance?.destroy();
		this.maskInstance = null;
		this.removeAttribute('data-ready');
	}

	private syncValue() {
		if (!this.maskInstance || !this.control) {
			return;
		}

		const next = readMaskValue(this.maskInstance, parseUnmaskMode(this.unmask));
		if (this.control.value === next) {
			return;
		}

		this.control.value = next;
		this.control.dispatchEvent(new Event('input', { bubbles: true }));
		this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: next } }));
	}

	override render(): JsxRenderable {
		return (
			<div class="se-masked">
				<input class="se-masked__value" data-ref="control" data-rui-control name={this.name} tabindex={-1} />
				<input
					id={this.inputId}
					data-ref="input"
					class="rui-input se-masked__input"
					type="text"
					placeholder={getMaskedInputPlaceholder(this.mask, this.placeholder)}
					autocomplete={this.autoComplete || undefined}
					inputmode={this.inputMode || undefined}
					autofocus={this.autoFocus}
					disabled={this.disabled}
					spellcheck={false}
				/>
			</div>
		);
	}
}

export function FormMaskedInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: MaskedInputFieldProps) {
	const { fieldGroupProps, controlProps } = bindField(config, {
		placeholder: config.placeholder,
		inputId: config.id ?? '',
		mask: config.mask,
		unmask: config.unmask === 'typed' ? 'typed' : config.unmask ? 'true' : '',
		lazy: config.lazy ?? true,
		overwrite: Boolean(config.overwrite),
		placeholderChar: config.placeholderChar ?? '',
		definitions: config.definitions,
		autoComplete: config.autoComplete ?? '',
		inputMode: config.inputMode ?? '',
		autoFocus: Boolean(config.autoFocus),
		defaultValue: typeof config.defaultValue === 'string' ? config.defaultValue : '',
	});

	return (
		<FieldGroup {...fieldGroupProps}>
			{jsx('se-masked-input', {
				...controlProps,
				'on:change': (event: Event) => {
					propsOnChange?.((event as CustomEvent<{ value?: string }>).detail?.value ?? '');
				},
				'on:blur': propsOnBlur,
				'on:focus': propsOnFocus,
			})}
		</FieldGroup>
	);
}
