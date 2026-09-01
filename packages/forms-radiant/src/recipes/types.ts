import type { JsxRenderable } from '@ecopages/jsx';
import type { FormShellLayout } from '@schema-engine/forms/recipes';

export type FormShellProps = FormShellLayout<JsxRenderable>;

export type FormShellComponent = (props: FormShellProps) => JsxRenderable;

export interface RadiantRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<'header' | 'progress' | 'actions', () => JsxRenderable>>;
}
