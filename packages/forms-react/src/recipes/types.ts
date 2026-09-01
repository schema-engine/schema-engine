import type React from 'react';
import type { FormShellLayout } from '@schema-engine/forms/recipes';

export type FormShellProps = FormShellLayout<React.ReactNode>;

export type FormShellComponent = React.FC<FormShellProps>;

export interface ReactRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<'header' | 'progress' | 'actions', React.FC>>;
}
