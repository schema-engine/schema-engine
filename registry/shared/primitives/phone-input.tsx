import { ChevronsUpDown } from 'lucide-react';
import * as BasePhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { detectCountryFromInput, formatPhoneInputValue } from './phone-country';

type PhoneInputProps = Omit<ComponentProps<'input'>, 'onChange' | 'value' | 'ref'> &
	Omit<BasePhoneInput.Props<typeof BasePhoneInput.default>, 'onChange'> & {
		onChange?: (value: BasePhoneInput.Value) => void;
	};

type PhoneInputApi = {
	country: BasePhoneInput.Country | undefined;
	international: boolean;
	selectCountry: (country: BasePhoneInput.Country) => void;
	registerCountrySelector: (selector: (country: BasePhoneInput.Country) => void) => void;
};

const PhoneInputApiContext = createContext<PhoneInputApi | null>(null);

function PhoneInput({
	className,
	onChange,
	onCountryChange,
	value,
	defaultCountry,
	international,
	...props
}: PhoneInputProps) {
	const [country, setCountry] = useState<BasePhoneInput.Country | undefined>(defaultCountry);
	const [selectCountry, setCountrySelector] = useState<(country: BasePhoneInput.Country) => void>(() => () => {});
	const registerCountrySelector = useCallback(
		(selector: (country: BasePhoneInput.Country) => void) => setCountrySelector(() => selector),
		[],
	);
	const useInternationalFormat = international === true;
	const api = useMemo(
		() => ({
			country,
			international: useInternationalFormat,
			selectCountry,
			registerCountrySelector,
		}),
		[country, useInternationalFormat, selectCountry, registerCountrySelector],
	);

	return (
		<PhoneInputApiContext.Provider value={api}>
			<BasePhoneInput.default
				{...props}
				className={cn(
					'flex',
					props['aria-invalid'] &&
						'[&_*[data-slot=popover-trigger]]:border-destructive [&_*[data-slot=popover-trigger]]:ring-destructive/50',
					className,
				)}
				flagComponent={FlagComponent}
				countrySelectComponent={CountrySelect}
				inputComponent={PhoneNumberInput}
				smartCaret={false}
				{...(useInternationalFormat ? { international: true } : { initialValueFormat: 'national' as const })}
				addInternationalOption={false}
				focusInputOnCountrySelection={false}
				defaultCountry={defaultCountry}
				value={value || undefined}
				onCountryChange={(nextCountry) => {
					setCountry(nextCountry);
					onCountryChange?.(nextCountry);
				}}
				onChange={(next) => onChange?.(next || ('' as BasePhoneInput.Value))}
			/>
		</PhoneInputApiContext.Provider>
	);
}

function PhoneNumberInput({ className, onChange, value, ...props }: ComponentProps<typeof Input>) {
	const api = useContext(PhoneInputApiContext);
	const country = api?.country ?? 'US';
	const displayValue =
		api?.international || value == null ? value : formatPhoneInputValue(String(value), country, false);

	return (
		<Input
			data-se-control
			{...props}
			value={displayValue}
			className={cn('rounded-s-none', className)}
			onChange={(event) => {
				onChange?.(event);
				const detected = detectCountryFromInput(event.currentTarget.value, country);
				if (detected !== country) {
					queueMicrotask(() => api?.selectCountry(detected));
				}
			}}
		/>
	);
}

type CountryEntry = { label: string; value: BasePhoneInput.Country | undefined };

type CountrySelectProps = {
	disabled?: boolean;
	value: BasePhoneInput.Country;
	options: CountryEntry[];
	onChange: (country: BasePhoneInput.Country) => void;
};

function CountrySelect({ disabled, value: selectedCountry, options: countryList, onChange }: CountrySelectProps) {
	const api = useContext(PhoneInputApiContext);
	const [searchValue, setSearchValue] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const registerCountrySelector = api?.registerCountrySelector;

	useEffect(() => registerCountrySelector?.(onChange), [onChange, registerCountrySelector]);

	return (
		<Popover
			open={isOpen}
			modal
			onOpenChange={(open) => {
				setIsOpen(open);
				if (open) {
					setSearchValue('');
				}
			}}
		>
			<PopoverTrigger
				render={(props) => (
					<Button
						data-se-control
						{...props}
						type="button"
						variant="outline"
						className="flex gap-1 rounded-s-md rounded-e-none border-r-0 px-3 focus:z-10"
						disabled={disabled}
						data-country={selectedCountry || undefined}
					>
						<FlagComponent country={selectedCountry} countryName={selectedCountry} />
						<ChevronsUpDown className={cn('-mr-1', disabled && 'hidden')} />
					</Button>
				)}
			/>
			<PopoverContent className="w-[300px] p-0">
				<Command>
					<CommandInput
						autoFocus
						value={searchValue}
						onValueChange={setSearchValue}
						placeholder="Search country..."
					/>
					<CommandList className="max-h-72">
						<CommandEmpty>No country found.</CommandEmpty>
						<CommandGroup>
							{countryList.map(({ value, label }) =>
								value ? (
									<CountrySelectOption
										key={value}
										country={value}
										countryName={label}
										selectedCountry={selectedCountry}
										onChange={onChange}
										onSelectComplete={() => setIsOpen(false)}
									/>
								) : null,
							)}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

interface CountrySelectOptionProps extends BasePhoneInput.FlagProps {
	selectedCountry: BasePhoneInput.Country;
	onChange: (country: BasePhoneInput.Country) => void;
	onSelectComplete: () => void;
}

function CountrySelectOption({
	country,
	countryName,
	selectedCountry,
	onChange,
	onSelectComplete,
}: CountrySelectOptionProps) {
	const handleSelect = () => {
		onChange(country);
		onSelectComplete();
	};

	return (
		<CommandItem
			value={`${countryName} ${country}`}
			data-checked={country === selectedCountry ? true : undefined}
			className="gap-2"
			onSelect={handleSelect}
		>
			<FlagComponent country={country} countryName={countryName} />
			<span className="flex-1 text-sm">{countryName}</span>
			<span className="text-foreground/50 text-sm">{`+${BasePhoneInput.getCountryCallingCode(country)}`}</span>
		</CommandItem>
	);
}

function FlagComponent({ country, countryName }: BasePhoneInput.FlagProps) {
	const Flag = flags[country];

	return (
		<span className="flex h-4 w-6 overflow-hidden rounded-sm [&_svg:not([class*='size-'])]:size-full">
			{Flag && <Flag title={countryName} />}
		</span>
	);
}

export { PhoneInput };
