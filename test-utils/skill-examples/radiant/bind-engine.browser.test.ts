import { expect, test } from 'vitest';
import { engine } from './app-engine';
import { bindEngine } from './bind-engine';

test('the packaged engine registers the default widgets, and an app binds it to every renderer', () => {
	expect(engine.elements.get('input')?.$type).toBe('input');

	const renderer = document.createElement('se-form-renderer');
	document.body.append(renderer);
	bindEngine(document);

	expect((renderer as unknown as { engine: unknown }).engine).toBe(engine);
});
