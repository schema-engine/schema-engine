/**
 * Compound Components - for full customization and composition
 */
export { DefaultStepper } from './default-stepper';
export { VerticalStepsStepper } from './vertical-stepper';
export { MinimalistStepper } from './minimalist-stepper';

/**
 * Pre-built Composed Layouts - ready-to-use implementations
 */
export { DefaultStepperComposed } from './default-stepper';
export { VerticalStepsStepperComposed } from './vertical-stepper';
export { MinimalistStepperComposed as DefaultMinimalistStepper } from './minimalist-stepper';

/**
 * Stepper CSS
 */
import './default-stepper.css';
import './vertical-stepper.css';
import './minimalist-stepper.css';

/**
 * Types
 */
export type { BaseStepperProps, StepperNavigation, StepData, StepperComponent } from './types';
export type { DefaultStepperConfig } from './default-stepper';
export type { VerticalStepsStepperConfig } from './vertical-stepper';
export type { MinimalistStepperConfig } from './minimalist-stepper';
