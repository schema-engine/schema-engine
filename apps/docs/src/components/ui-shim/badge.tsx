import type { HTMLAttributes, ReactNode } from 'react';

const cn = (...classes: (string | false | null | undefined)[]) =>
	classes.filter(Boolean).join(' ');

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const variantClasses: Record<BadgeVariant, string> = {
	default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
	secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
	destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
	outline: 'text-foreground',
};

export function badgeVariants({
	variant = 'default',
	className = '',
}: { variant?: BadgeVariant; className?: string } = {}): string {
	return cn(
		'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
		variantClasses[variant],
		className,
	);
}

type BadgeProps = HTMLAttributes<HTMLDivElement> & {
	variant?: BadgeVariant;
	children?: ReactNode;
};

export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
	return (
		<div className={badgeVariants({ variant, className })} {...rest}>
			{children}
		</div>
	);
}
