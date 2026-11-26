import * as React from 'react';
import { Check, X } from 'lucide-react';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { combineHandlers, fieldText, useFormField } from '@schema-engine/forms-react/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SelectFieldProps, SelectOption } from './form-select.types';

function optionKey(option: SelectOption) {
	return String(option.value);
}

/** The value of the option a key stands for, as the option declares it: a number stays a number. */
function optionValueOf(options: readonly SelectOption[], key: string) {
	return options.find((option) => optionKey(option) === key)?.value ?? key;
}

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SelectFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, required, containerStyles } = useFormField(config, {
		controlled: true,
	});
	const isMultiple = Boolean(config.multiple);
	const [open, setOpen] = React.useState(false);
	const selectingRef = React.useRef(false);

	const selectedValues = isMultiple ? (Array.isArray(value) ? value : []).map(String) : [];
	const selectedOptions = config.options.filter((option) => selectedValues.includes(optionKey(option)));
	const selectValue = fieldText(value);
	const selectedLabel = config.options.find((option) => optionKey(option) === selectValue)?.label;

	const commitMultiple = (next: string[]) => {
		combineHandlers(onChange, propsOnChange)(next.map((key) => optionValueOf(config.options, key)));
	};

	const toggleValue = (nextValue: string) => {
		const exists = selectedValues.includes(nextValue);
		commitMultiple(exists ? selectedValues.filter((item) => item !== nextValue) : [...selectedValues, nextValue]);
	};

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={required}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<Select
				{...(isMultiple
					? {
							value: '',
							open,
							onOpenChange: (nextOpen: boolean) => {
								if (!nextOpen && selectingRef.current) return;
								setOpen(nextOpen);
							},
						}
					: { value: selectValue })}
				onValueChange={(nextValue) => {
					if (isMultiple) {
						selectingRef.current = true;
						toggleValue(String(nextValue));
						requestAnimationFrame(() => {
							selectingRef.current = false;
							setOpen(true);
						});
						return;
					}
					combineHandlers(onChange, propsOnChange)(optionValueOf(config.options, String(nextValue)));
				}}
				disabled={fieldProps.disabled}
			>
				<SelectTrigger
					data-se-control={isMultiple ? undefined : ''}
					{...fieldProps}
					className={isMultiple ? 'h-auto min-h-8 w-full' : undefined}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
				>
					{isMultiple ? (
						selectedOptions.length > 0 ? (
							<span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
								{selectedOptions.map((option) => (
									<span
										key={optionKey(option)}
										className="bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
									>
										{option.label}
										<span
											role="button"
											tabIndex={-1}
											aria-label={`Remove ${option.label}`}
											className="text-muted-foreground hover:text-foreground"
											onPointerDown={(event) => {
												event.preventDefault();
												event.stopPropagation();
											}}
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												commitMultiple(
													selectedValues.filter((item) => item !== optionKey(option)),
												);
											}}
										>
											<X className="size-3" />
										</span>
									</span>
								))}
							</span>
						) : (
							<span className="text-muted-foreground">{config.placeholder || 'Select options'}</span>
						)
					) : (
						<SelectValue placeholder={config.placeholder}>{selectedLabel}</SelectValue>
					)}
				</SelectTrigger>
				<SelectContent>
					{config.options.map((option) => {
						const key = optionKey(option);
						const isSelected = selectedValues.includes(key);
						return (
							<SelectItem
								key={key}
								value={key}
								disabled={option.disabled}
								className={isMultiple ? 'pr-2 [&_.absolute]:hidden' : undefined}
							>
								{isMultiple ? (
									<span className="flex items-center gap-2">
										<span
											className={`flex size-3.5 items-center justify-center rounded-sm border ${
												isSelected
													? 'border-primary bg-primary text-primary-foreground'
													: 'border-input'
											}`}
											aria-hidden
										>
											{isSelected ? <Check className="size-2.5" /> : null}
										</span>
										{option.label}
									</span>
								) : (
									option.label
								)}
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
		</FieldGroup>
	);
}
