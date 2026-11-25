import { describe, test } from 'vitest';
import { formStateContainerConformance } from '@/testing/form-state-container-conformance';
import { createFormStateContainer } from '@/state-container/create-form-state-container';

formStateContainerConformance(createFormStateContainer, { describe, test });
