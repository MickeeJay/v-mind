import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VaultCreationStepper } from '@/components/vault-creation/vault-creation-stepper';

describe('VaultCreationStepper', () => {
  it('marks the current step for assistive technologies', () => {
    render(<VaultCreationStepper currentStep={3} />);

    const currentStep = screen.getByText('Review and confirm').closest('li');
    expect(currentStep).not.toBeNull();
    expect(currentStep).toHaveAttribute('aria-current', 'step');
  });
});
