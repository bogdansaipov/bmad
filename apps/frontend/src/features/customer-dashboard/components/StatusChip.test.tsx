import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusChip } from './StatusChip';
import type { RequestStatus } from '@handrix/contracts';

const STATUS_LABELS: Array<[RequestStatus, string]> = [
  ['PENDING', 'Pending'],
  ['ASSIGNED', 'Assigned'],
  ['ON_THE_WAY', 'On the Way'],
  ['ARRIVED', 'Arrived'],
  ['WORKING', 'Working'],
  ['COMPLETE', 'Complete'],
  ['REJECTED', 'Rejected'],
];

describe('StatusChip', () => {
  it.each(STATUS_LABELS)('renders correct text for %s', (status, expected) => {
    render(<StatusChip status={status} />);
    expect(screen.getByText(expected)).toBeDefined();
  });

  it.each(STATUS_LABELS)('renders accessible label for %s (not color-only)', (status, expected) => {
    render(<StatusChip status={status} />);
    const chip = screen.getByText(expected);
    expect(chip).toBeDefined();
    expect(chip.getAttribute('aria-label')).toBe(`Status: ${expected}`);
  });
});
