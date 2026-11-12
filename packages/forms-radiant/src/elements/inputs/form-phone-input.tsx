import './form-phone-input.css';
import { onEvent, onUpdated, prop, query, RadiantElement, state } from '@ecopages/radiant';
import { jsx, unsafeHtml, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '@ecopages/radiant-ui/select';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '@ecopages/radiant-ui/autocomplete';
import { RuiListbox, RuiListboxOption, RuiListboxOptionIndicator } from '@ecopages/radiant-ui/listbox';
import type { CountryCode } from 'libphonenumber-js';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import {
	detectCountryFromInput,
	formatPhoneInputValue,
	hydratePhoneValue,
	listPhoneCountries,
	loadCountryFlags,
	loadLibphonenumber,
	phoneInputToE164,
	resolvePhoneCountry,
	countryFlagSvg,
	type LibPhoneNumber,
	type PhoneCountryOption,
} from '@/lib/phone-number';
import type { PhoneInputFieldProps } from './form-phone-input.types';
import { formElement } from '@/lib/define-element';

function PhoneFlag({ code, class: className }: { code?: string; class: string }) {
	const svg = code ? countryFlagSvg(code) : '';
	return (
		<span class={className} aria-hidden="true">
			{svg ? unsafeHtml(svg) : null}
		</span>
	);
}

@formElement('se-phone-input')
export class SePhoneInput extends RadiantElement {
	@prop({ type: String }) name = '';
	@prop({ type: String }) inputId = '';
	@prop({ type: String }) placeholder = '';
	@prop({ type: String }) defaultCountry = 'US';
	@prop({ type: String }) defaultValue = '';
	@prop({ type: Boolean, defaultValue: false }) international = false;
	@prop({ type: Boolean, defaultValue: false }) disabled = false;

	@state country: CountryCode = 'US';
	@state countries: PhoneCountryOption[] = [];

	@query({ ref: 'number' }) numberInput!: HTMLInputElement | null;
	@query({ ref: 'control' }) control!: HTMLInputElement | null;

	private e164 = '';
	private lib?: LibPhoneNumber;
	private bootGeneration = 0;

	protected override onConnected(): void {
		void this.boot();
		this.registerCleanupCallback(() => {
			this.bootGeneration += 1;
			this.lib = undefined;
			this.removeAttribute('data-ready');
		});
	}

	@onUpdated(['defaultCountry', 'defaultValue', 'international'])
	onConfigUpdated(): void {
		if (this.lib) {
			this.hydrateFromValue(this.e164 || this.defaultValue);
		}
	}

	@onEvent({ type: 'rui-change', selector: 'rui-select' })
	onCountryChange(event: Event) {
		event.stopPropagation();
		if (!this.lib) {
			return;
		}
		const next = (event as CustomEvent<{ value?: string | readonly string[] }>).detail?.value;
		this.setCountry(resolvePhoneCountry(this.lib, next, this.country));
		this.applyNumber(this.numberInput?.value ?? this.e164);
	}

	@onEvent({ type: 'input', selector: '[data-ref="number"]' })
	onNumberInput(event: Event) {
		this.applyNumber((event.target as HTMLInputElement).value);
	}

	private async boot() {
		const generation = ++this.bootGeneration;
		const [lib] = await Promise.all([loadLibphonenumber(), loadCountryFlags()]);
		if (generation !== this.bootGeneration || !this.isConnected) {
			return;
		}

		this.lib = lib;
		this.countries = listPhoneCountries(lib);
		this.hydrateFromValue(this.control?.value || this.defaultValue);
		this.setAttribute('data-ready', '');
	}

	private hydrateFromValue(value: string) {
		if (!this.lib) {
			return;
		}

		const fallback = resolvePhoneCountry(this.lib, this.defaultCountry);
		const hydrated = hydratePhoneValue(this.lib, value, fallback, this.international);
		this.setCountry(hydrated.country);
		this.e164 = hydrated.e164;
		this.applyDisplay(hydrated.display);
		this.syncControl(hydrated.e164);
	}

	private setCountry(code: CountryCode) {
		if (this.country !== code) {
			this.country = code;
		}
		this.setAttribute('data-country', code);
	}

	private applyNumber(raw: string) {
		if (!this.lib) {
			this.e164 = raw;
			this.syncControl(raw);
			return;
		}

		this.setCountry(detectCountryFromInput(this.lib, raw, this.country));
		const display = formatPhoneInputValue(this.lib, raw, this.country, this.international);
		this.e164 = phoneInputToE164(this.lib, raw, this.country);
		this.applyDisplay(display);
		this.syncControl(this.e164);
	}

	private applyDisplay(display: string) {
		if (this.numberInput && this.numberInput.value !== display) {
			this.numberInput.value = display;
		}
	}

	private syncControl(value: string) {
		if (!this.control || this.control.value === value) {
			return;
		}

		this.control.value = value;
		this.control.dispatchEvent(new Event('input', { bubbles: true }));
		this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value } }));
	}

	private selectedCountry() {
		return this.countries.find((option) => option.code === this.country);
	}

	override render(): JsxRenderable {
		const display = this.lib
			? formatPhoneInputValue(this.lib, this.e164, this.country, this.international)
			: this.e164;
		const selected = this.selectedCountry();

		return (
			<div class="se-phone">
				<input class="se-phone__value" data-ref="control" data-rui-control name={this.name} tabindex={-1} />
				<RuiSelect label="Country" value={this.country} disabled={this.disabled || this.countries.length === 0}>
					<RuiSelectControl>
						<RuiSelectTrigger disabled={this.disabled || this.countries.length === 0}>
							<RuiSelectValue>
								<PhoneFlag code={selected?.code} class="se-phone__flag" />
							</RuiSelectValue>
						</RuiSelectTrigger>
						<RuiSelectToggle disabled={this.disabled || this.countries.length === 0} />
					</RuiSelectControl>
					<RuiSelectListbox>
						<RuiAutocomplete>
							<RuiSelectSearch placeholder="Search country..." disabled={this.disabled} />
							<RuiAutocompleteCollection>
								<RuiListbox embedded selectionMode="single" value={this.country} label="Countries">
									{this.countries.map((option) => (
										<RuiListboxOption
											value={option.code}
											label={`${option.name} ${option.code} +${option.callingCode}`}
										>
											<PhoneFlag code={option.code} class="se-phone__option-flag" />
											<span class="se-phone__option-name">{option.name}</span>
											<span class="se-phone__option-code">+{option.callingCode}</span>
											<RuiListboxOptionIndicator />
										</RuiListboxOption>
									))}
								</RuiListbox>
								<RuiAutocompleteEmpty>No country found.</RuiAutocompleteEmpty>
							</RuiAutocompleteCollection>
						</RuiAutocomplete>
					</RuiSelectListbox>
				</RuiSelect>
				<input
					id={this.inputId}
					data-ref="number"
					class="rui-input se-phone__number"
					type="tel"
					autocomplete="tel"
					placeholder={this.placeholder}
					disabled={this.disabled}
					value={display}
					spellcheck={false}
				/>
			</div>
		);
	}
}

export function FormPhoneInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: PhoneInputFieldProps) {
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
			{jsx('se-phone-input', {
				name: config.name,
				placeholder: config.placeholder,
				disabled: config.disabled,
				inputId: config.id ?? '',
				defaultCountry: config.defaultCountry ?? 'US',
				international: Boolean(config.international),
				defaultValue: typeof config.defaultValue === 'string' ? config.defaultValue : '',
				'on:change': (event: Event) => {
					propsOnChange?.((event as CustomEvent<{ value?: string }>).detail?.value ?? '');
				},
				'on:blur': propsOnBlur,
				'on:focus': propsOnFocus,
			})}
		</FieldGroup>
	);
}
