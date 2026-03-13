import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/lib/api-client';

describe('api client query params', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves camelCase query params for GET requests', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api.get('/api/transactions', {
      accountId: 'account-1',
      pageSize: 25,
      startDate: '2026-01-01',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions?accountId=account-1&pageSize=25&startDate=2026-01-01',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('preserves camelCase query params for uploads while snake-casing payload fields', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({
        rows: [],
        headers: [],
        total_rows: 0,
        error_count: 0,
        skipped_rows: 0,
        detected_delimiter: ',',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const file = new File(['Date,Description,Amount'], 'sample.csv', {
      type: 'text/csv',
    });

    await api.upload(
      '/api/import/preview',
      file,
      { parserId: 'parser-123' },
      {
        payload: {
          accountId: 'account-1',
          selectedRowIndexes: [0, 2],
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/import/preview?parserId=parser-123');

    const formData = options.body as FormData;
    expect(formData.get('file')).toBeInstanceOf(File);
    expect(formData.get('payload')).toBe(
      JSON.stringify({
        account_id: 'account-1',
        selected_row_indexes: [0, 2],
      }),
    );
  });
});
