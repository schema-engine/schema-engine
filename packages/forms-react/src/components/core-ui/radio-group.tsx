import { Radio } from '@base-ui-components/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui-components/react/radio-group';
import { CircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

function RadioGroup({ className, ...props }: ComponentProps<typeof BaseRadioGroup>) {
	return <BaseRadioGroup data-slot="radio-group" className={cn('group grid gap-3', className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: ComponentProps<typeof Radio.Root>) {
	return (
		<Radio.Root
			data-slot="radio-group-item"
			className={cn(
				'peer bg-input text-primary hover:border-ring/70 focus-visible:ring-ring/50 aria-invalid:ring-destructive/50 aria-invalid:border-destructive data-checked:border-primary aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow,border-color] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
				className,
			)}
			{...props}
		>
			<Radio.Indicator data-slot="radio-group-indicator" className="relative flex items-center justify-center">
				<CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 translate-y-[3px]" />
			</Radio.Indicator>
		</Radio.Root>
	);
}

export { RadioGroup, RadioGroupItem };
