import { Separator as BaseSeparator } from '@base-ui/react/separator';

import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

function Separator({ className, orientation = 'horizontal', ...props }: ComponentProps<typeof BaseSeparator>) {
	return (
		<BaseSeparator
			data-slot="separator"
			orientation={orientation}
			className={cn(
				'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px',
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
