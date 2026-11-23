/**
 * Story Wrapper Component for Form Engine
 *
 * This component wraps stories with the necessary providers
 * (FormEngineProvider and FormProvider) for rendering forms in Storybook.
 */

import type { ReactNode } from 'react';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { getEngine as getDefaultEngine } from './form-builder.ui';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';

const defaultFormEngine = getDefaultEngine();

interface StoryWrapperProps {
	children: ReactNode;
	engine?: FormEngine;
}

/**
 * Wraps stories with FormEngineProvider
 *
 * @example
 * ```tsx
 * export const MyStory = () => (
 *   <StoryWrapper>
 *     <FormRenderer config={myFormConfig} />
 *   </StoryWrapper>
 * );
 * ```
 */
export function StoryWrapper({ children, engine = defaultFormEngine }: StoryWrapperProps) {
	return <FormEngineProvider engine={engine}>{children}</FormEngineProvider>;
}
