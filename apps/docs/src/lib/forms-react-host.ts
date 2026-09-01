/**
 * Single import graph for the docs FormRenderer island.
 * Every React / forms-react runtime import in the island must go through this
 * module so createRoot, FormRenderer, adapter, and registrations share one copy.
 */
export { createElement } from 'react';
export { createRoot } from 'react-dom/client';
export { FormEngineProvider, FormRenderer, createReactFormComposer } from '@schema-engine/forms-react';
export { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';
export { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
