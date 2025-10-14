/**
 * Compound Components - for full customization and composition
 */
export { DefaultStepper } from './default-stepper';
export { MinimalistStepper } from './minimalist-stepper';
export { DebuggerStepper } from './debugger-stepper';

/**
 * Pre-built Composed Layouts - ready-to-use implementations
 */
export { DefaultStepperComposed } from './default-stepper';
export { MinimalistStepperComposed as DefaultMinimalistStepper } from './minimalist-stepper';
export { DebuggerStepperComposed } from './debugger-stepper';

/**
 * Stepper CSS
 */
import './default-stepper.css';
import './minimalist-stepper.css';
import './debugger-stepper.css';

/**
 * Types
 */
export type { BaseStepperProps, StepperNavigation, StepData, StepperComponent } from './types';
export type { DefaultStepperConfig } from './default-stepper.types';
export type { MinimalistStepperConfig } from './minimalist-stepper';
export type { DebuggerStepperConfig } from './debugger-stepper';
