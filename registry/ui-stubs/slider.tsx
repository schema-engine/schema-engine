import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

type SliderProps = Omit<ComponentProps<'input'>, 'onChange' | 'value' | 'defaultValue' | 'type'> &
	StubExtras & {
		value?: number | number[];
		defaultValue?: number | number[];
		onValueChange?: (value: number[]) => void;
	};

export function Slider({ value, defaultValue: _defaultValue, onValueChange, ...props }: SliderProps) {
	const { rest } = splitExtras(props);
	const single = Array.isArray(value) ? value[0] : value;

	return (
		<input
			type="range"
			{...rest}
			value={single ?? ''}
			onChange={(event) => onValueChange?.([Number(event.target.value)])}
		/>
	);
}
