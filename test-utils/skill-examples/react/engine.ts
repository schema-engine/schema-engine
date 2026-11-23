import { createFormEngine } from '@schema-engine/forms';
import { ratingFieldRegistration } from './rating-field';
import { textFieldRegistration } from './text-field';

export const engine = createFormEngine({ elements: [textFieldRegistration, ratingFieldRegistration] });
