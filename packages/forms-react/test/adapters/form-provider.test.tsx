import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/adapters/rhf/form-provider';
import type { FormConfig } from '@schema-engine/forms/schemas';
import React from 'react';
import { useFormContext } from 'react-hook-form';

// Mocks
const mockExecuteTrigger = mock(() => Promise.resolve([{ success: true }]));

mock.module('@/hooks/use-form-context', () => ({
    useFormEngine: () => ({ engine: {} }),
}));

mock.module('@/hooks/use-action-executor', () => ({
    useActionExecutor: () => ({ executeTrigger: mockExecuteTrigger }),
}));

// Mock useFormValidationResolver
mock.module('../../src/adapters/rhf/hooks/use-form-validation-resolver', () => ({
    useFormValidationResolver: () => async () => ({ values: {}, errors: {} }),
}));

describe('FormProvider', () => {
    const config: FormConfig = {
        id: 'test-form',
        title: 'Test Form',
        steps: [
            { title: 'Step 1', elements: [{ name: 'field1', type: 'text' }] },
        ],
        actions: [
            { type: 'test-action', trigger: 'form_mount' },
            { type: 'test-action', trigger: 'form_submit_start' },
            { type: 'test-action', trigger: 'form_submit' }
        ],
    };

    beforeEach(() => {
        mockExecuteTrigger.mockClear();
    });

    it('should fire form_mount on mount', async () => {
        render(
            <FormProvider config={config}>
                <div>Form Content</div>
            </FormProvider>
        );

        await waitFor(() => {
            expect(mockExecuteTrigger).toHaveBeenCalled();
        });

        // Check if form_mount was called
        const calls = mockExecuteTrigger.mock.calls;
        const formStartCall = calls.find(call => call[1] === 'form_mount');
        expect(formStartCall).toBeDefined();
    });

    it('should fire form_submit_start before form_submit on submit', async () => {
        render(
            <FormProvider config={config}>
                <button type="submit">Submit</button>
            </FormProvider>
        );

        const submitButton = screen.getByText('Submit');
        fireEvent.click(submitButton);

        await waitFor(() => {
            // Should have called form_submit_start and form_submit
            const calls = mockExecuteTrigger.mock.calls;
            const submitStartCalls = calls.filter(call => call[1] === 'form_submit_start');
            const formSubmitCalls = calls.filter(call => call[1] === 'form_submit');
            
            expect(submitStartCalls.length).toBeGreaterThanOrEqual(1);
            expect(formSubmitCalls.length).toBeGreaterThanOrEqual(1);
        });

        const calls = mockExecuteTrigger.mock.calls;
        
        // Filter for submit related calls
        const submitRelatedCalls = calls.filter(call => ['form_submit_start', 'form_submit'].includes(call[1]));
        
        // We expect at least one pair of form_submit_start -> form_submit
        // And form_submit_start should be before form_submit
        const lastSubmitStart = submitRelatedCalls.findIndex(call => call[1] === 'form_submit_start');
        const lastFormSubmit = submitRelatedCalls.findIndex(call => call[1] === 'form_submit');
        
        expect(lastSubmitStart).toBeGreaterThan(-1);
        expect(lastFormSubmit).toBeGreaterThan(-1);
        
        // In the sequence of submit calls, start should be before submit
        // Note: findIndex finds the *first* occurrence.
        // If we have multiple pairs, we need to be careful.
        // But assuming one click = one sequence.
        
        // Let's just check the order of the last two calls if possible, or just that we have them in order in the array
        
        // Get the indices in the full calls array
        const submitStartIndex = calls.findIndex(call => call[1] === 'form_submit_start');
        const formSubmitIndex = calls.findIndex(call => call[1] === 'form_submit');
        
        expect(submitStartIndex).toBeLessThan(formSubmitIndex);
    });
});
