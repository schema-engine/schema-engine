# Form Elements Stories

This directory contains comprehensive Storybook stories for all form elements in the Form Engine.

## Overview

Each element has multiple story variations demonstrating different use cases, configurations, and validation scenarios. All stories use the card layout for consistent presentation.

## Available Stories

### Input Elements

#### FormInput (`form-input.stories.tsx`)

- **Default**: Basic text input
- **Email**: Email input with proper type
- **Password**: Password input field
- **WithValidation**: Multiple inputs with validation rules
- **ComplexValidation**: Advanced password validation with multiple rules
- **MultipleInputs**: Contact form with various input types (text, email, tel, url)

#### FormTextarea (`form-textarea.stories.tsx`)

- **Default**: Standard textarea with 4 rows
- **SmallTextarea**: Compact textarea with 2 rows
- **LargeTextarea**: Large textarea with 8 rows
- **WithValidation**: Textarea with min/max length validation
- **MultipleTextareas**: Application form with multiple textarea fields

#### FormSelect (`form-select.stories.tsx`)

- **Default**: Basic select with country options
- **WithValidation**: Required select field with validation
- **MultipleSelects**: Profile setup with multiple select fields
- **LongOptionsList**: Select with many options (US states example)

#### FormCheckbox (`form-checkbox.stories.tsx`)

- **Default**: Single checkbox for newsletter subscription
- **WithValidation**: Required checkbox for terms acceptance
- **MultipleCheckboxes**: Notification preferences with multiple checkboxes
- **WithRequiredCheckboxes**: Account setup with mix of required and optional checkboxes

#### FormRadio (`form-radio.stories.tsx`)

- **Default**: Basic radio group for plan selection
- **WithDescriptions**: Radio group with helpful descriptions
- **WithValidation**: Required radio selection for survey
- **MultipleRadioGroups**: Order configuration with multiple radio groups
- **YesNoQuestion**: Simple yes/no radio question

#### FormSwitch (`form-switch.stories.tsx`)

- **Default**: Single switch for notifications
- **WithValidation**: Required switch for terms acceptance
- **MultipleSwitches**: Privacy settings with multiple switches
- **NotificationSettings**: Comprehensive notification preferences
- **FeatureToggles**: App feature toggles with switches

#### FormNumber (`form-number.stories.tsx`)

- **Default**: Basic number input
- **WithMinMax**: Age input with min/max constraints
- **WithStep**: Price input with decimal step
- **WithValidation**: Quantity input with validation rules
- **MultipleNumbers**: Order form with multiple number inputs
- **RangeInput**: Budget range with min/max inputs

### Action Elements

#### SubmitButton (`submit-button.stories.tsx`)

- **Default**: Basic submit button
- **CustomLabel**: Submit button with custom label
- **WithFormValidation**: Complete contact form with validation
- **LoginForm**: Login form example
- **SignupForm**: Registration form with terms checkbox
- **SubscriptionForm**: Newsletter subscription form

## Common Features

All stories include:

- **No Layout Configuration**: Stories focus on the elements themselves without layout styling
- **Validation Examples**: Most stories include validation scenarios
- **Form Wrapper**: Stories use StoryWrapper component providing FormEngineProvider
- **Real-world Examples**: Practical use cases like login, signup, contact forms
- **Accessibility**: Proper labels, descriptions, and placeholders

## Using Stories

These stories serve multiple purposes:

1. **Documentation**: Visual examples of how to use each element
2. **Testing**: Interactive testing of components in isolation
3. **Development**: Reference implementations for new features
4. **Quality Assurance**: Validation testing and edge case handling

## Story Structure

Each story follows this pattern:

```typescript
export const StoryName: Story = {
  args: {
    config: createForm()
      .setId('unique-id')
      .setTitle('Form Title')
      .addStep({ id: 'step-1', title: 'Step Title' })
      .addElement('element-type', {
        // Element configuration
        rules: [ValidationPresets...] // Optional validation
      })
      .addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
      .build(),
  },
};
```

Note: Stories do not include layout configuration (`.setStepLayout()`) to keep the focus on the elements themselves.

## Validation

Stories demonstrate validation using `ValidationPresets` from the core package:

- `ValidationPresets.string.required()`
- `ValidationPresets.string.email()`
- `ValidationPresets.string.minLength()`
- `ValidationPresets.string.maxLength()`
- `ValidationPresets.string.pattern()`
- `ValidationPresets.string.url()`
- `ValidationPresets.number.required()`
- `ValidationPresets.number.min()`
- `ValidationPresets.number.max()`

## Running Stories

```bash
cd packages/react
bun run storybook
```

Navigate to "Elements" in the Storybook sidebar to view all element stories.
