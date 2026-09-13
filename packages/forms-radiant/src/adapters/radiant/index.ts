import type { FormAdapter } from '../types';
import { FormProvider } from './form-provider';

export const radiantAdapter: FormAdapter = { FormProvider };
export { FormProvider };
export { FormController, formController } from './controller';
