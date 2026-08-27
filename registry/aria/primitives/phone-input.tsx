import { CheckIcon, ChevronsUpDown } from 'lucide-react';
import * as BasePhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ListBox, ListBoxItem } from 'react-aria-components';

import { cn } from '@/lib/utils';
import { useState, type ComponentProps } from 'react';

type PhoneInputProps = Omit<ComponentProps<'input'>, 'onChange' | 'value' | 'ref'> &
	Omit<BasePhoneInput.Props<typeof BasePhoneInput.default>, 'onChange'> & {
		onChange?: (value: BasePhoneInput.Value) => void;
	};

function PhoneInput({ className, onChange, value, ...props }: PhoneInputProps) {
	return (
		<BasePhoneInput.default
			className={cn(
				'flex',
				props['aria-invalid'] &&
					'[&_*[data-slot=popover-trigger]]:border-destructive [&_*[data-slot=popover-trigger]]:ring-destructive/50',
				className,
			)}
			flagComponent={FlagComponent}
			countrySelectComponent={CountrySelect}
			inputComponent={InputComponent}
			smartCaret={false}
			value={value || undefined}
			onChange={(value) => onChange?.(value || ('' as BasePhoneInput.Value))}
			{...props}
		/>
	);
}

function InputComponent({ className, ...props }: ComponentProps<typeof Input>) {
	return <Input className={cn('rounded-s-none', className)} {...props} />;
}

type CountryEntry = { label: string; value: BasePhoneInput.Country | undefined };

type CountrySelectProps = {
	disabled?: boolean;
	value: BasePhoneInput.Country;
	options: CountryEntry[];
	onChange: (country: BasePhoneInput.Country) => void;
};

function CountrySelect({ disabled, value: selectedCountry, options: countryList, onChange }: CountrySelectProps) {
	const [searchValue, setSearchValue] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const filtered = countryList.filter(
		({ label, value }) =>
			value &&
			(label.toLowerCase().includes(searchValue.toLowerCase()) ||
				value.toLowerCase().includes(searchValue.toLowerCase())),
	);

	return (
		<Popover open={isOpen} modal onOpenChange={setIsOpen}>
			<PopoverTrigger
				render={(props) => (
					<Button
						{...props}
						type="button"
						variant="outline"
						className="flex gap-1 rounded-s-md rounded-e-none border-r-0 px-3 focus:z-10"
						disabled={disabled}
					>
						<FlagComponent country={selectedCountry} countryName={selectedCountry} />
						<ChevronsUpDown className={cn('-mr-1', disabled && 'hidden')} />
					</Button>
				)}
			/>
			<PopoverContent className="w-[300px] p-2">
				<Input
					value={searchValue}
					onChange={(event) => setSearchValue(event.target.value)}
					placeholder="Search country..."
					className="mb-2"
				/>
				<ListBox
					aria-label="Countries"
					selectionMode="single"
					selectedKeys={[selectedCountry]}
					onSelectionChange={(keys) => {
						const key = Array.from(keys)[0];
						if (key) {
							onChange(key as BasePhoneInput.Country);
							setIsOpen(false);
						}
					}}
					className="max-h-72 overflow-y-auto"
				>
					{filtered.map(({ value, label }) =>
						value ? (
							<ListBoxItem
								key={value}
								id={value}
								textValue={label}
								className="data-[focused]:bg-accent relative flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-sm outline-none"
							>
								<FlagComponent country={value} countryName={label} />
								<span className="flex-1 text-sm">{label}</span>
								<span className="text-foreground/50 text-sm">{`+${BasePhoneInput.getCountryCallingCode(value)}`}</span>
								<CheckIcon
									className={`ml-auto size-4 shrink-0 ${value === selectedCountry ? 'opacity-100' : 'opacity-0'}`}
								/>
							</ListBoxItem>
						) : null,
					)}
				</ListBox>
			</PopoverContent>
		</Popover>
	);
}

function FlagComponent({ country, countryName }: BasePhoneInput.FlagProps) {
	const Flag = flags[country];

	return (
		<span className="bg-foreground/20 flex h-4 w-6 overflow-hidden rounded-sm [&_svg:not([class*='size-'])]:size-full">
			{Flag && <Flag title={countryName} />}
		</span>
	);
}

export { PhoneInput };
