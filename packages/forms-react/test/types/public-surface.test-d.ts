import * as root from '@schema-engine/forms-react';
import { useFormContext } from '@schema-engine/forms-react/adapters';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';
import { useFormInstanceActions } from '@schema-engine/forms-react/hooks';
import { FormElement, FormElements } from '@schema-engine/forms-react/primitives';

void [
	root.FormEngineProvider,
	root.FormRenderer,
	useFormContext,
	rhfAdapter,
	useFormInstanceActions,
	FormElement,
	FormElements,
];

type RootExports = typeof import('@schema-engine/forms-react');
type AssertNotExported<Key extends PropertyKey> = Key extends keyof RootExports ? false : true;

const absentRootExports: [
	AssertNotExported<'rhfAdapter'>,
	AssertNotExported<'useFormContext'>,
	AssertNotExported<'FormElements'>,
] = [true, true, true];

void absentRootExports;
