import type { ComponentProps } from 'react';
import type { StubExtras } from './props';

export function Separator({
	orientation,
	variant: _variant,
	size: _size,
	asChild: _asChild,
	render: _render,
	...props
}: Omit<ComponentProps<'div'>, 'aria-orientation'> &
	Omit<StubExtras, 'orientation'> & {
		orientation?: 'horizontal' | 'vertical';
	}) {
	return <div role="separator" aria-orientation={orientation} {...props} />;
}
