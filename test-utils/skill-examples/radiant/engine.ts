import { createRadiantFormEngine } from '@schema-engine/forms-radiant';
import { starsFieldRegistration } from './stars-field';
import { textFieldRegistration } from './text-field';

export const engine = createRadiantFormEngine({ elements: [textFieldRegistration, starsFieldRegistration] });
