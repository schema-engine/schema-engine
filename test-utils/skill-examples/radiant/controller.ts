import { FormController } from '@schema-engine/forms-radiant';

export function containerOf(host: HTMLElement) {
	return new FormController(host).container;
}
