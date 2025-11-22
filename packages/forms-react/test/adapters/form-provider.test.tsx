import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/adapters/rhf/form-provider';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { mockExecuteTrigger, setupActionExecutorMock } from '../utils/use-action-executor.mock';

setupActionExecutorMock();

mock.module('@/hooks/use-form-context', () => ({
    useFormEngine: () => ({ engine: {} }),
}));


mock.module('../../src/adapters/rhf/hooks/use-form-validation-resolver', () => ({
    useFormValidationResolver: () => async () => ({ values: {}, errors: {} }),
}));

describe('FormProvider', () => {
    const config: FormConfig = {
        id: 'test-form',
        title: 'Test Form',
        mode: 'wizard',
        steps: [
            { id: 'step-1', title: 'Step 1', elements: [{ name: 'field1', $type: 'input', inputType: 'text' }] },
        ],
        actions: [
            { id: 'action-1', type: 'submit', enabled: true, endpoint: '/submit', method: 'POST', triggers: ['form_mount'] },
            { id: 'action-2', type: 'submit', enabled: true, endpoint: '/submit', method: 'POST', triggers: ['form_submit_start'] },
            { id: 'action-3', type: 'submit', enabled: true, endpoint: '/submit', method: 'POST', triggers: ['form_submit'] }
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
            const calls = mockExecuteTrigger.mock.calls;
            const submitStartCalls = calls.filter(call => call[1] === 'form_submit_start');
            const formSubmitCalls = calls.filter(call => call[1] === 'form_submit');
            
            expect(submitStartCalls.length).toBeGreaterThanOrEqual(1);
            expect(formSubmitCalls.length).toBeGreaterThanOrEqual(1);
        });

        const calls = mockExecuteTrigger.mock.calls;
        
        const submitRelatedCalls = calls.filter(call => ['form_submit_start', 'form_submit'].includes(call[1]));
        
        const lastSubmitStart = submitRelatedCalls.findIndex(call => call[1] === 'form_submit_start');
        const lastFormSubmit = submitRelatedCalls.findIndex(call => call[1] === 'form_submit');
        
        expect(lastSubmitStart).toBeGreaterThan(-1);
        expect(lastFormSubmit).toBeGreaterThan(-1);
        
        const submitStartIndex = calls.findIndex(call => call[1] === 'form_submit_start');
        const formSubmitIndex = calls.findIndex(call => call[1] === 'form_submit');
        
        expect(submitStartIndex).toBeLessThan(formSubmitIndex);
    });
});
