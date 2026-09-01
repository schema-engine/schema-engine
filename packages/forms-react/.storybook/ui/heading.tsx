import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const headingVariants = cva('group/heading flex w-full max-w-lg flex-col', {
	variants: {
		size: {
			sm: 'gap-1',
			md: 'gap-1',
			lg: 'gap-2',
		},
		align: {
			start: 'items-start text-left',
			center: 'items-center text-center',
		},
	},
	defaultVariants: {
		size: 'md',
		align: 'start',
	},
});

function Heading({
	className,
	size = 'md',
	align = 'start',
	as: Comp = 'header',
	...props
}: ComponentProps<'header'> &
	VariantProps<typeof headingVariants> & {
		as?: 'header' | 'div' | 'section';
	}) {
	return (
		<Comp
			data-slot="heading"
			data-size={size}
			className={cn(headingVariants({ size, align }), className)}
			{...props}
		/>
	);
}

function HeadingEyebrow({ className, ...props }: ComponentProps<'p'>) {
	return <p data-slot="heading-eyebrow" className={cn('m-0 text-sm text-muted-foreground', className)} {...props} />;
}

function HeadingTitle({
	className,
	as: Comp = 'h2',
	...props
}: ComponentProps<'h2'> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }) {
	return (
		<Comp
			data-slot="heading-title"
			className={cn(
				'm-0 text-balance font-semibold tracking-tight group-data-[size=sm]/heading:text-lg group-data-[size=md]/heading:text-xl group-data-[size=lg]/heading:text-4xl group-data-[size=lg]/heading:font-bold',
				className,
			)}
			{...props}
		/>
	);
}

function HeadingDescription({ className, ...props }: ComponentProps<'p'>) {
	return (
		<p
			data-slot="heading-description"
			className={cn(
				'm-0 text-pretty text-muted-foreground group-data-[size=sm]/heading:text-sm group-data-[size=md]/heading:text-sm group-data-[size=lg]/heading:text-lg',
				className,
			)}
			{...props}
		/>
	);
}

export { Heading, HeadingDescription, HeadingEyebrow, HeadingTitle, headingVariants };
