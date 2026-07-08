/**
 * A static, server-rendered contact form preview.
 *
 * Mirrors the contact-form.json schema in the docs site so readers
 * see the actual rendered markup without needing the React runtime.
 * The form is server-rendered by ecopages-jsx (no React hooks, no
 * client hydration) and is intended to show shape, not submission.
 * The onsubmit handler is a no-op that opens a friendly alert.
 */
import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

const Body = () => (
	<form
		class="static-contact-form"
		action="#"
		method="post"
		onsubmit="event.preventDefault(); alert('This is a static preview. Drop the same JSON into a React app to wire submission.');"
	>
		<div class="static-contact-form__row">
			<label for="preview-email" class="static-contact-form__label">
				Email Address
			</label>
			<input
				id="preview-email"
				name="email"
				type="email"
				required
				placeholder="you@example.com"
				class="static-contact-form__input"
			/>
		</div>
		<div class="static-contact-form__row">
			<label for="preview-message" class="static-contact-form__label">
				Message
			</label>
			<textarea
				id="preview-message"
				name="message"
				required
				placeholder="Tell us what you're building…"
				rows={5}
				class="static-contact-form__textarea"
			/>
		</div>
		<div class="static-contact-form__footer">
			<p class="static-contact-form__hint">Driven by the JSON config on the right.</p>
			<button type="submit" class="static-contact-form__submit">
				Submit Form
			</button>
		</div>
	</form>
);

export const StaticContactForm = eco.component<Record<string, never>, JsxRenderable>({
	dependencies: {
		stylesheets: ['./static-contact-form.css'],
	},
	render: () => <Body />,
});
