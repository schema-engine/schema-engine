import { FormEngineShowcase } from '@/components/form-engine-showcase';
import { FormEngineLayout } from '@/layouts/form-engine-layout';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

const Showcase: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<FormEngineLayout>
			<FormEngineShowcase />
		</FormEngineLayout>
	);
};

Showcase.config = {
	importMeta: import.meta,
	dependencies: {
		components: [FormEngineLayout],
	},
};

export default Showcase;
