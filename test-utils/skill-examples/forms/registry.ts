import { createFormEngine } from '@schema-engine/forms';
import { postalCode } from './custom-rule';
import { textRegistration } from './engine';

export const appEngine = createFormEngine({ elements: [textRegistration], validations: [postalCode] });

export const elementTypes = appEngine.elements.all().map(({ $type }) => $type);

export const ruleTypes = appEngine.validations.keys();
