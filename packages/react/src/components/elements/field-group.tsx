import type React from 'react';
import { Label } from '@/shadcn/ui/label';
import { cn } from '@/shadcn/lib/utils';

interface FieldGroupProps {
	label: string;
	htmlFor?: string;
	hiddenLabel?: boolean;
	required?: boolean;
	description?: string;
	error?: string;
	className?: string;
	children: React.ReactNode;
	style?: React.CSSProperties;
}

export function FieldGroup({
	label,
	htmlFor,
	hiddenLabel = false,
	required = false,
	description,
	error,
	className,
	children,
	style,
}: FieldGroupProps) {
	return (
		<div className={cn('space-y-2', className)} style={style}>
			<Label
				htmlFor={htmlFor}
				className={cn(
					'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
					hiddenLabel && 'sr-only',
				)}
			>
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			<div className="space-y-1">
				{children}
				{error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : description ? (
					<p className="text-sm text-muted-foreground">{description}</p>
				) : null}
			</div>
		</div>
	);
}
