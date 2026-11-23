import { createFormRuntime, type FormValues } from '@schema-engine/forms';
import { notifyEngine, notifyForm } from './notify-action';

export function createNotifyRuntime(onSubmit: (values: FormValues) => void) {
	const runtime = createFormRuntime({
		engine: notifyEngine,
		config: notifyForm,
		host: { focus: () => {} },
		onSubmit,
	});
	const unmount = runtime.mount();
	return { runtime, unmount };
}
