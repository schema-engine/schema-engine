import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

type CheckboxProps = Omit<ComponentProps<'input'>, 'onChange' | 'type'> &
	StubExtras & { onCheckedChange?: (checked: boolean) => void };

export function Checkbox({ onCheckedChange, ...props }: CheckboxProps) {
	const { rest } = splitExtras(props);
	return <input type="checkbox" {...rest} onChange={(event) => onCheckedChange?.(event.target.checked)} />;
}
