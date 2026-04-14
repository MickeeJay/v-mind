import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VaultCreationStepper } from '@/components/vault-creation/vault-creation-stepper';

describe('VaultCreationStepper', () => {
  it('tracks the active step across the flow', () => {
    const { rerender } = render(<VaultCreationStepper currentStep={1} />);

    expect(screen.getByText('Choose strategy').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Configure deposit').closest('li')?.getAttribute('aria-current')).toBeNull();

    rerender(<VaultCreationStepper currentStep={3} />);

    expect(screen.getByText('Review and confirm').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Choose strategy').closest('li')?.getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('Configure deposit').closest('li')?.querySelector('span')?.classList.contains('border-emerald-500/60')).toBe(true);

    rerender(<VaultCreationStepper currentStep={5} />);

    expect(screen.getByText('Success').closest('li')?.getAttribute('aria-current')).toBe('step');
  });
});
