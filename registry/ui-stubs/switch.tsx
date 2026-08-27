import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

type SwitchProps = Omit<ComponentProps<'input'>, 'onChange' | 'type'> &
	StubExtras & { onCheckedChange?: (checked: boolean) => void };

export function Switch({ onCheckedChange, ...props }: SwitchProps) {
	const { rest } = splitExtras(props);
	return (
		<input type="checkbox" role="switch" {...rest} onChange={(event) => onCheckedChange?.(event.target.checked)} />
	);
}
