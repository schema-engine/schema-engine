export type { ViewModel as ViewContextValue, ViewNavigation, ViewStep } from '@schema-engine/forms/recipes';

import { createContext } from '@ecopages/radiant/context';
import type { ViewModel } from '@schema-engine/forms/recipes';

export const viewContext = createContext<ViewModel>(Symbol.for('se-form-view-context'));
