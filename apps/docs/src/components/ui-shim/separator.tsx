import type { HTMLAttributes } from 'react';

const cn = (...classes: (string | false | null | undefined)[]) =>
	classes.filter(Boolean).join(' ');

type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
	orientation?: 'horizontal' | 'vertical';
	decorative?: boolean;
};

export function Separator({
	orientation = 'horizontal',
	className,
	decorative = true,
	...rest
}: SeparatorProps) {
	return (
		<div
			role={decorative ? 'none' : 'separator'}
			aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
			className={cn(
				'shrink-0 bg-border',
				orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
				className,
			)}
			{...rest}
		/>
	);
}
