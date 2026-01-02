import { ConditionalFormDemo } from '@/components/demo/conditional-form-demo';
import { FormEngineLayout } from '@/layouts/form-engine-layout';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

const ConditionalForms: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<FormEngineLayout>
			<ConditionalFormDemo />
		</FormEngineLayout>
	);
};

ConditionalForms.config = {
	dependencies: {
		components: [FormEngineLayout],
	},
};

export default ConditionalForms;
