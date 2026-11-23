import { createContext } from 'react';
import type { AppearanceSelection } from '@schema-engine/layout';

/**
 * What a field host takes from the element `FormElement` is rendering.
 *
 * @remarks
 * Field hosts (`FieldGroupRoot`, `useFieldHost`) read it through `useFieldAppearanceAttributes` and
 * `useFieldClassName`, so a registry component does not thread `appearance` or `className` into its
 * host by hand. A nested element's own `FormElement` provides its own value, so a container's
 * appearance and class never reach its children's hosts.
 */
export interface FieldHostConfig {
	appearance?: AppearanceSelection;
	className?: string;
}

export const FieldHostContext = createContext<FieldHostConfig | undefined>(undefined);
