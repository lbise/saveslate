import { describe, expect, it } from 'vitest';

import { clearAllStoredUserData } from '../../src/lib/user-data';

describe('clearAllStoredUserData', () => {
  it('removes saved finance data and preserves preferences', () => {
    localStorage.setItem('saveslate:transactions', '[]');
    localStorage.setItem('saveslate:import-batches', '[]');
    localStorage.setItem('saveslate:goals', '[]');
    localStorage.setItem('saveslate:accounts', '[]');
    localStorage.setItem('saveslate:tags', '[]');
    localStorage.setItem('saveslate:automation-rules', '[]');
    localStorage.setItem('saveslate:csv-parsers', '[]');
    localStorage.setItem('saveslate:settings:default-currency', 'USD');
    localStorage.setItem('saveslate:settings:data-profile', 'demo-balanced');

    clearAllStoredUserData();

    expect(localStorage.getItem('saveslate:transactions')).toBeNull();
    expect(localStorage.getItem('saveslate:import-batches')).toBeNull();
    expect(localStorage.getItem('saveslate:goals')).toBeNull();
    expect(localStorage.getItem('saveslate:accounts')).toBeNull();
    expect(localStorage.getItem('saveslate:tags')).toBeNull();
    expect(localStorage.getItem('saveslate:automation-rules')).toBeNull();
    expect(localStorage.getItem('saveslate:csv-parsers')).toBeNull();
    expect(localStorage.getItem('saveslate:settings:default-currency')).toBe('USD');
    expect(localStorage.getItem('saveslate:settings:data-profile')).toBe('demo-balanced');
  });
});
