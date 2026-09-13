import { FormController } from './form-controller';

export interface FormControllerHost extends HTMLElement {
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
	requestUpdate(): void;
}

/**
 * RadiantElement runs these prototype lists during connect/SSR. Same Symbol.for
 * key as `@ecopages/radiant` so legacy `@formController` participates in that
 * lifecycle without importing Radiant internals.
 */
const LEGACY_POST_CONSTRUCTION_INITIALIZERS = Symbol.for('@ecopages/radiant.legacy-post-construction-initializers');

function formControllerStandard<Host extends FormControllerHost>(
	_target: undefined,
	context: ClassFieldDecoratorContext<Host, FormController>,
): (this: Host) => FormController {
	context.addInitializer(function () {
		wireFormController(this, context.access.get(this));
	});
	return function () {
		return new FormController(this);
	};
}

function formControllerLegacy(proto: FormControllerHost, propertyKey: string): void {
	const target = proto as FormControllerHost & Record<PropertyKey, unknown>;
	const own = Object.prototype.hasOwnProperty.call(target, LEGACY_POST_CONSTRUCTION_INITIALIZERS)
		? target[LEGACY_POST_CONSTRUCTION_INITIALIZERS]
		: undefined;
	const initializers = Array.isArray(own) ? own : [];
	if (!Array.isArray(own)) {
		Object.defineProperty(target, LEGACY_POST_CONSTRUCTION_INITIALIZERS, { value: initializers });
	}

	initializers.push((element: FormControllerHost) => {
		const host = element as FormControllerHost & Record<string, FormController | undefined>;
		const existing = host[propertyKey];
		const controller = existing instanceof FormController ? existing : new FormController(element);
		host[propertyKey] = controller;
		wireFormController(element, controller);
	});
}

function wireFormController(host: FormControllerHost, controller: FormController): void {
	if (!(controller instanceof FormController)) {
		throw new TypeError('@formController requires a FormController field.');
	}
	host.registerConnectedCallback(() => controller.connect(() => host.requestUpdate()));
	host.registerCleanupCallback(() => controller.disconnect());
}

/**
 * Optional lifecycle wiring for {@link FormController}.
 *
 * @remarks
 * Dual dispatch, same as Radiant: TC39 standard field decorators
 * (`experimentalDecorators: false`) and TypeScript experimental/legacy
 * (`experimentalDecorators: true`).
 */
export function formController<Host extends FormControllerHost>(
	protoOrTarget: undefined,
	nameOrContext: ClassFieldDecoratorContext<Host, FormController>,
): (this: Host) => FormController;
export function formController(protoOrTarget: FormControllerHost, nameOrContext: string): void;
export function formController<Host extends FormControllerHost>(
	protoOrTarget: Host | undefined,
	nameOrContext: string | ClassFieldDecoratorContext<Host, FormController>,
): ((this: Host) => FormController) | void {
	if (typeof nameOrContext === 'object') {
		return formControllerStandard(undefined, nameOrContext);
	}
	return formControllerLegacy(protoOrTarget as FormControllerHost, nameOrContext);
}
