import { JsonBuilderDemo } from '@/components/json-builder-demo';
import { FormEngineLayout } from '@/layouts/form-engine-layout';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

const JsonBuilder: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<FormEngineLayout>
			<JsonBuilderDemo />
		</FormEngineLayout>
	);
};

JsonBuilder.config = {
	importMeta: import.meta,
	dependencies: {
		components: [FormEngineLayout],
	},
};

export default JsonBuilder;
