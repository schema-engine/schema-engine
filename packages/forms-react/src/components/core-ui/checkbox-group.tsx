'use client';

import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';

import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

function CheckboxGroup({ className, ...props }: ComponentProps<typeof BaseCheckboxGroup>) {
	return <BaseCheckboxGroup className={cn('flex flex-col items-start gap-1', className)} {...props} />;
}

export { CheckboxGroup };
