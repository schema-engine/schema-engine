import { describe, test } from 'vitest';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { formStateContainerConformance } from '@schema-engine/forms/testing';

formStateContainerConformance(createFormStateContainer, { describe, test });
