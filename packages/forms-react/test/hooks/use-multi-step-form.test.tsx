import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useMultiStepForm } from '../../src/hooks/use-multi-step-form';
import type { FormConfig } from '@schema-engine/forms/schemas';

const mockTrigger = mock(() => Promise.resolve(true));
const mockSetFocus = mock(() => {});
const mockGetValues = mock(() => ({}));
const mockExecuteTrigger = mock(() => Promise.resolve([]));

mock.module('react-hook-form', () => ({
    useFormContext: () => ({
        trigger: mockTrigger,
        setFocus: mockSetFocus,
        getValues: mockGetValues,
        formState: { errors: {}, isSubmitting: false, isValid: true, submitCount: 0, touchedFields: {} },
    }),
}));

mock.module('@/hooks/use-form-context', () => ({
    useFormEngine: () => ({ engine: {} }),
}));

mock.module('@/hooks/use-action-executor', () => ({
    useActionExecutor: () => ({ executeTrigger: mockExecuteTrigger }),
}));

describe('useMultiStepForm', () => {
    const config: FormConfig = {
        id: 'test-form',
        title: 'Test Form',
        mode: 'wizard',
        steps: [
            { id: 'step-1', title: 'Step 1', elements: [{ name: 'field1', $type: 'input', inputType: 'text' }] },
            { id: 'step-2', title: 'Step 2', elements: [{ name: 'field2', $type: 'input', inputType: 'text' }] },
        ],
        actions: [{ id: 'action-1', type: 'submit', enabled: true, endpoint: '/submit', method: 'POST', triggers: ['step_change'] }],
    };

    beforeEach(() => {
        mockTrigger.mockClear();
        mockExecuteTrigger.mockClear();
    });

    it('should initialize with first step', () => {
        const { result } = renderHook(() => useMultiStepForm(config));
        expect(result.current.currentStepIndex).toBe(0);
    });

    it('should go to next step if validation passes', async () => {
        const { result } = renderHook(() => useMultiStepForm(config));
        
        await act(async () => {
            await result.current.navigation.goToNextStep();
        });

        expect(mockTrigger).toHaveBeenCalled();
        expect(result.current.currentStepIndex).toBe(1);
        
        const calls = mockExecuteTrigger.mock.calls as unknown as Array<[unknown, string]>;
        expect(mockExecuteTrigger).toHaveBeenCalledTimes(3);
        expect(calls[0][1]).toBe('step_leave');
        expect(calls[1][1]).toBe('step_change');
        expect(calls[2][1]).toBe('step_enter');
    });
});
