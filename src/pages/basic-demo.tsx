import { FormEngineDemo } from '@/components/form-engine-demo';
import { FormEngineLayout } from '@/layouts/form-engine-layout';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

const BasicDemo: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<FormEngineLayout>
			<FormEngineDemo />
		</FormEngineLayout>
	);
};

BasicDemo.config = {
	importMeta: import.meta,
	dependencies: {
		components: [FormEngineLayout],
	},
};

export default BasicDemo;
