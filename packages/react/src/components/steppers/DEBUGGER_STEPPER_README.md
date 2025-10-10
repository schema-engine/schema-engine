# Debugger Stepper

A modern, developer-focused stepper component that provides a floating widget interface for debugging and monitoring multi-step forms. Inspired by browser developer tools, it offers a non-intrusive way to track form progress and inspect step states.

## Features

- **FAB Button Interface**: Floating Action Button that stays out of the way until needed
- **Collapsible Panel**: Expands into a full-featured debug panel on demand
- **Real-time Progress**: Visual progress bar with percentage indicator
- **Step Timeline**: Interactive timeline showing all steps with completion status
- **Step Details**: Detailed information about each step (ID, index, validation state)
- **Form State Inspector**: View current form state and submission status
- **Responsive Design**: Adapts to mobile and desktop screens
- **Modern UI**: Sleek, animated interface with smooth transitions
- **Accessibility**: Full keyboard navigation and ARIA labels

## Usage

### Basic Implementation

```tsx
import { FormRenderer } from "@json-form-engine/react";

const formConfig = {
	id: "my-form",
	title: "User Registration",
	steps: [
		// ... your steps
	],
	stepper: {
		stepperId: "debugger",
		showStepDetails: true,
		defaultExpanded: false,
		showFormState: true,
	},
};

<FormRenderer config={formConfig} />;
```

### Configuration Options

```typescript
interface DebuggerStepperConfig {
	stepperId: "debugger";
	showStepDetails?: boolean; // Show detailed step info (default: true)
	defaultExpanded?: boolean; // Start with panel expanded (default: false)
	showFormState?: boolean; // Show form state section (default: true)
}
```

### Custom Composition

You can use the compound components for full customization:

```tsx
import { DebuggerStepper } from "@json-form-engine/react";

<DebuggerStepper>
	<div className="form-content">{/* Your form fields */}</div>
</DebuggerStepper>;
```

## Component Architecture

The debugger stepper follows the compound component pattern:

- `DebuggerStepper` - Root component with FAB button
- `DebuggerStepper.Header` - Panel header with title and close button
- `DebuggerStepper.Content` - Main content area with timeline and details
- `DebuggerStepper.Navigation` - Bottom navigation controls

## UI Elements

### FAB Button

- Located at bottom-right corner
- Pulsing animation to draw attention
- Click to expand the debug panel
- Responsive positioning on mobile

### Debug Panel

- Progress bar with percentage
- Step timeline with status indicators
- Current step details section
- Form state inspector
- Navigation controls with step dots

### Step States

- **Active**: Currently displayed step (highlighted)
- **Completed**: Successfully validated steps (green checkmark)
- **Pending**: Future steps (grayed out)
- **Invalid**: Steps with validation errors (red indicator)

## Styling

The stepper uses CSS custom properties for theming:

```css
:root {
	--debugger-stepper-primary: hsl(var(--primary));
	--debugger-stepper-success: hsl(142 76% 36%);
	--debugger-stepper-error: hsl(0 84% 60%);
	/* ... more variables */
}
```

Import the CSS in your application:

```tsx
import "@json-form-engine/react/steppers/debugger-stepper.css";
```

## Best Practices

### When to Use

- Development and debugging of multi-step forms
- QA testing and form validation verification
- Demonstrating form flow to stakeholders
- Complex forms where step state visibility is helpful

### When NOT to Use

- Production forms for end users (unless specifically desired)
- Simple single-step forms
- Forms where debugging information should be hidden

### Tips

1. Start with `defaultExpanded: false` to keep it minimized
2. Use `showStepDetails: true` during development
3. Toggle `showFormState` based on what you need to debug
4. The widget is positioned fixed, so it works with any layout

## Responsive Behavior

- **Desktop**: Full panel (28rem width) with all features
- **Mobile**: Compressed panel (full width minus margins)
- **Navigation buttons**: Text hidden on mobile, icons only
- **FAB button**: Slightly smaller on mobile devices

## Accessibility

- Full keyboard navigation support
- ARIA labels on all interactive elements
- Focus management for expand/collapse
- Screen reader friendly status updates
- High contrast design for visibility

## Examples

### Development Mode

```tsx
stepper: {
  stepperId: 'debugger',
  showStepDetails: true,
  defaultExpanded: true,
  showFormState: true,
}
```

### QA Testing

```tsx
stepper: {
  stepperId: 'debugger',
  showStepDetails: true,
  defaultExpanded: false,
  showFormState: false,
}
```

### Minimal Debug

```tsx
stepper: {
  stepperId: 'debugger',
  showStepDetails: false,
  defaultExpanded: false,
  showFormState: false,
}
```

## Browser Support

Works in all modern browsers that support:

- CSS Grid and Flexbox
- CSS Custom Properties
- CSS Animations
- ES6+ JavaScript

## Performance

- Minimal re-renders using context
- CSS transforms for smooth animations
- Lazy rendering of debug information
- Optimized for 60fps interactions
