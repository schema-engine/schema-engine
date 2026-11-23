import type { FormConfigView } from '@schema-engine/forms';

/** An action as the form runtime reads it: the loose shape every typed action of a normalized config extends. */
export type RuntimeAction = Exclude<NonNullable<FormConfigView['actions']>[number], readonly unknown[]>;
