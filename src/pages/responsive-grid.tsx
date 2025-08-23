import { ResponsiveGridDemo } from '@/components/responsive-grid-demo';
import { FormEngineLayout } from '@/layouts/form-engine-layout';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

const ResponsiveGrid: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<FormEngineLayout>
			<ResponsiveGridDemo />
		</FormEngineLayout>
	);
};

ResponsiveGrid.config = {
	importMeta: import.meta,
	dependencies: {
		components: [FormEngineLayout],
	},
};

export default ResponsiveGrid;
