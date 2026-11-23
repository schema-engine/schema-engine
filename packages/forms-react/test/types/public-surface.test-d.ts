import * as root from '@schema-engine/forms-react';
import { useFormContext, useFormInstanceActions } from '@schema-engine/forms-react/hooks';
import { FormElement, FormElements } from '@schema-engine/forms-react/primitives';

void [root.FormEngineProvider, root.FormRenderer, useFormContext, useFormInstanceActions, FormElement, FormElements];

type RootExports = typeof import('@schema-engine/forms-react');
type AssertNotExported<Key extends PropertyKey> = Key extends keyof RootExports ? false : true;

const absentRootExports: [AssertNotExported<'useFormContext'>, AssertNotExported<'FormElements'>] = [true, true];

void absentRootExports;
