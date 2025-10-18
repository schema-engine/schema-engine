import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

function Label({ className, ...props }: ComponentProps<'label'>) {
	return (
		<label
			data-slot="label"
			className={cn(
				'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled]:pointer-events-none group-data-[disabled]:opacity-50 peer-disabled:pointer-events-none peer-disabled:opacity-50',
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
