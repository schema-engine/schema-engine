import { ActionsDemo } from '../components/actions-demo';
import { FormEngineLayout } from '@/layouts/form-engine-layout';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

const ActionDemo: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<FormEngineLayout>
			<ActionsDemo />
		</FormEngineLayout>
	);
};

ActionDemo.config = {
	importMeta: import.meta,
	dependencies: {
		components: [FormEngineLayout],
	},
};

export default ActionDemo;
