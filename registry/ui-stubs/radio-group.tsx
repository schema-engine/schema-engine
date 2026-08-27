import type { ComponentProps, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { splitExtras, type StubExtras } from './props';

const RadioGroupContext = createContext<{ value?: string; onValueChange?: (value: string) => void }>({});

type RadioGroupProps = Omit<ComponentProps<'div'>, 'onChange'> &
	StubExtras & { value?: string; onValueChange?: (value: string) => void };

export function RadioGroup({ value, onValueChange, children, ...props }: RadioGroupProps) {
	const { rest } = splitExtras(props);
	return (
		<RadioGroupContext.Provider value={{ value, onValueChange }}>
			<div role="radiogroup" {...rest}>
				{children}
			</div>
		</RadioGroupContext.Provider>
	);
}

export function RadioGroupItem({
	value,
	children,
	...props
}: Omit<ComponentProps<'input'>, 'type'> & StubExtras & { children?: ReactNode }) {
	const group = useContext(RadioGroupContext);
	const { rest } = splitExtras(props);

	return (
		<input
			type="radio"
			{...rest}
			value={value}
			checked={group.value === value}
			onChange={() => group.onValueChange?.(String(value))}
		/>
	);
}
