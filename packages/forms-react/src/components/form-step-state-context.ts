import { createContext } from 'react';
import type { StepStates } from '@schema-engine/forms';

export const FormStepStateContext = createContext<StepStates | null>(null);
