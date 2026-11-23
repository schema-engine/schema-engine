import type { FormRendererElement } from '@schema-engine/forms-radiant';
import { engine } from './app-engine';

export function bindEngine(root: ParentNode): void {
	for (const renderer of root.querySelectorAll<FormRendererElement>('se-form-renderer')) {
		renderer.engine = engine;
	}
}
