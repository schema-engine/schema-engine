import type { HTMLAttributes, ReactNode } from 'react';

const cn = (...classes: (string | false | null | undefined)[]) =>
	classes.filter(Boolean).join(' ');

type DivProps = HTMLAttributes<HTMLDivElement> & { children?: ReactNode };

export function Card({ className, children, ...rest }: DivProps) {
	return (
		<div
			className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
			{...rest}
		>
			{children}
		</div>
	);
}

export function CardHeader({ className, children, ...rest }: DivProps) {
	return (
		<div className={cn('flex flex-col space-y-1.5 p-6', className)} {...rest}>
			{children}
		</div>
	);
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn('font-semibold leading-none tracking-tight', className)}
			{...rest}
		>
			{children}
		</h3>
	);
}

export function CardDescription({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p className={cn('text-sm text-muted-foreground', className)} {...rest}>
			{children}
		</p>
	);
}

export function CardContent({ className, children, ...rest }: DivProps) {
	return (
		<div className={cn('p-6 pt-0', className)} {...rest}>
			{children}
		</div>
	);
}

export function CardFooter({ className, children, ...rest }: DivProps) {
	return (
		<div className={cn('flex items-center p-6 pt-0', className)} {...rest}>
			{children}
		</div>
	);
}
