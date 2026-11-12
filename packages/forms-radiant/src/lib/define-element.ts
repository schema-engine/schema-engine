import { CUSTOM_ELEMENT_TAG_NAME } from '@ecopages/jsx';
import { customElement } from '@ecopages/radiant';

const RENDERER_TAG = 'se-form-renderer';
const pending = new Map<string, () => void>();
let deferring = false;

/**
 * Registers a form host like `@customElement`, unless definitions are deferred.
 *
 * @remarks
 * Radiant defines a host when its module evaluates, and a defined host upgrades
 * the server-rendered elements already in the document, so an app cannot bind an
 * engine to those elements first. While `deferFormElements()` is in effect the
 * definition waits for `defineFormElements()`.
 *
 * @remarks
 * The tag is stamped on the class immediately, so a view can render the host
 * while it is deferred. Everything else Radiant does in its class initializer
 * (host attributes, prop metadata, `observedAttributes`, `customElements.define`)
 * is deferred as one unit, which assumes the stamp is independent of it.
 */
export function formElement(tag: string, options?: Parameters<typeof customElement>[1]) {
	const register = customElement(tag, options);
	return <T extends CustomElementConstructor>(target: T, context: ClassDecoratorContext<T>): void => {
		register(target, {
			...context,
			addInitializer: (initializer) =>
				context.addInitializer(function (this: T) {
					Reflect.set(this, CUSTOM_ELEMENT_TAG_NAME, tag);
					const define = () => initializer.call(this);
					if (deferring) pending.set(tag, define);
					else define();
				}),
		});
	};
}

/**
 * Makes the form hosts evaluated from now on wait for `defineFormElements()`.
 *
 * @remarks
 * Call it before importing `@schema-engine/forms-radiant`, then bind the engine to the
 * server-rendered `se-form-renderer` elements and call `defineFormElements()`.
 */
export function deferFormElements(): void {
	deferring = true;
}

/**
 * Defines every deferred form host and returns to defining on evaluation.
 *
 * @remarks
 * `se-form-renderer` is defined first, so it publishes its engine before the
 * hosts below it upgrade and resolve it.
 */
export function defineFormElements(): void {
	deferring = false;
	const renderer = pending.get(RENDERER_TAG);
	pending.delete(RENDERER_TAG);
	renderer?.();
	for (const define of pending.values()) define();
	pending.clear();
}
