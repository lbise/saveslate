import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useImportExport } from '../../src/hooks';

import type { ChangeEvent } from 'react';

function createMockFile(content: string, name = 'test.json'): File {
  const file = new File([content], name, { type: 'application/json' });
  file.text = () => Promise.resolve(content);
  return file;
}

function createFileChangeEvent(
  file?: File,
): ChangeEvent<HTMLInputElement> {
  const fileList = file
    ? { 0: file, length: 1, item: () => file }
    : { length: 0, item: () => null };

  return {
    target: {
      files: file ? (fileList as unknown as FileList) : (fileList as unknown as FileList),
      value: 'C:\\fakepath\\test.json',
    },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

describe('useImportExport', () => {
  const defaultOptions = () => ({
    parseFile: vi.fn((content: string) => JSON.parse(content)),
    onImportSuccess: vi.fn(),
  });

  describe('initial state', () => {
    it('has importError as null', () => {
      const { result } = renderHook(() =>
        useImportExport(defaultOptions()),
      );
      expect(result.current.importError).toBeNull();
    });

    it('has isImporting as false', () => {
      const { result } = renderHook(() =>
        useImportExport(defaultOptions()),
      );
      expect(result.current.isImporting).toBe(false);
    });

    it('provides an importInputRef', () => {
      const { result } = renderHook(() =>
        useImportExport(defaultOptions()),
      );
      expect(result.current.importInputRef).toBeDefined();
      expect(result.current.importInputRef.current).toBeNull();
    });
  });

  describe('openFilePicker', () => {
    it('clears any existing importError', async () => {
      const opts = defaultOptions();
      opts.parseFile.mockImplementation(() => {
        throw new Error('parse failed');
      });
      const { result } = renderHook(() => useImportExport(opts));

      // Trigger an error first
      const event = createFileChangeEvent(createMockFile('bad'));
      await act(async () => {
        await result.current.handleFileChange(event);
      });
      expect(result.current.importError).toBe('parse failed');

      // openFilePicker should clear it
      act(() => {
        result.current.openFilePicker();
      });
      expect(result.current.importError).toBeNull();
    });

    it('calls click on importInputRef.current when ref is attached', () => {
      const { result } = renderHook(() =>
        useImportExport(defaultOptions()),
      );

      const mockInput = document.createElement('input');
      const clickSpy = vi.spyOn(mockInput, 'click');

      // Manually assign the ref
      (result.current.importInputRef as React.MutableRefObject<HTMLInputElement>).current = mockInput;

      act(() => {
        result.current.openFilePicker();
      });

      expect(clickSpy).toHaveBeenCalledOnce();
    });
  });

  describe('handleFileChange', () => {
    it('calls parseFile and onImportSuccess with a valid file', async () => {
      const opts = defaultOptions();
      const payload = { accounts: [{ name: 'Savings' }] };
      const { result } = renderHook(() => useImportExport(opts));

      const event = createFileChangeEvent(
        createMockFile(JSON.stringify(payload)),
      );

      await act(async () => {
        await result.current.handleFileChange(event);
      });

      expect(opts.parseFile).toHaveBeenCalledWith(JSON.stringify(payload));
      expect(opts.onImportSuccess).toHaveBeenCalledWith(payload);
      expect(result.current.importError).toBeNull();
      expect(result.current.isImporting).toBe(false);
    });

    it('sets importError when parseFile throws an Error', async () => {
      const opts = defaultOptions();
      opts.parseFile.mockImplementation(() => {
        throw new Error('Invalid JSON structure');
      });
      const { result } = renderHook(() => useImportExport(opts));

      const event = createFileChangeEvent(createMockFile('not json'));

      await act(async () => {
        await result.current.handleFileChange(event);
      });

      expect(result.current.importError).toBe('Invalid JSON structure');
      expect(opts.onImportSuccess).not.toHaveBeenCalled();
      expect(result.current.isImporting).toBe(false);
    });

    it('sets importError to default message when parseFile throws non-Error', async () => {
      const opts = defaultOptions();
      opts.parseFile.mockImplementation(() => {
        throw 'something went wrong'; // eslint-disable-line no-throw-literal
      });
      const { result } = renderHook(() => useImportExport(opts));

      const event = createFileChangeEvent(createMockFile('bad'));

      await act(async () => {
        await result.current.handleFileChange(event);
      });

      expect(result.current.importError).toBe('Failed to import file.');
      expect(opts.onImportSuccess).not.toHaveBeenCalled();
      expect(result.current.isImporting).toBe(false);
    });

    it('does nothing when no file is selected', async () => {
      const opts = defaultOptions();
      const { result } = renderHook(() => useImportExport(opts));

      const event = createFileChangeEvent(); // no file

      await act(async () => {
        await result.current.handleFileChange(event);
      });

      expect(opts.parseFile).not.toHaveBeenCalled();
      expect(opts.onImportSuccess).not.toHaveBeenCalled();
      expect(result.current.importError).toBeNull();
      expect(result.current.isImporting).toBe(false);
    });

    it('resets event.target.value to empty string', async () => {
      const opts = defaultOptions();
      const { result } = renderHook(() => useImportExport(opts));

      const event = createFileChangeEvent(createMockFile('{}'));

      await act(async () => {
        await result.current.handleFileChange(event);
      });

      expect(event.target.value).toBe('');
    });

    it('sets importError when onImportSuccess throws', async () => {
      const opts = defaultOptions();
      opts.onImportSuccess.mockImplementation(() => {
        throw new Error('Failed to merge data');
      });
      const { result } = renderHook(() => useImportExport(opts));

      const event = createFileChangeEvent(createMockFile('{}'));

      await act(async () => {
        await result.current.handleFileChange(event);
      });

      expect(result.current.importError).toBe('Failed to merge data');
      expect(result.current.isImporting).toBe(false);
    });
  });

  describe('exportJsonFile', () => {
    it('creates a blob download link and triggers download', () => {
      const mockUrl = 'blob:http://localhost/fake-blob-url';
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue(mockUrl);
      const revokeObjectURLSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => {});

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const createElementSpy = vi.spyOn(document, 'createElement');

      const { result } = renderHook(() =>
        useImportExport(defaultOptions()),
      );

      const payload = { transactions: [{ amount: 100 }] };

      act(() => {
        result.current.exportJsonFile('export.json', payload);
      });

      // Verify createElement was called with 'a'
      expect(createElementSpy).toHaveBeenCalledWith('a');

      // Find the anchor that was appended
      const appendedAnchor = appendChildSpy.mock.calls.find(
        (call) => (call[0] as HTMLElement).tagName === 'A',
      )?.[0] as HTMLAnchorElement;

      expect(appendedAnchor).toBeDefined();
      expect(appendedAnchor.href).toBe(mockUrl);
      expect(appendedAnchor.download).toBe('export.json');

      // Verify blob was created with correct content
      expect(createObjectURLSpy).toHaveBeenCalledOnce();
      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');

      // Verify cleanup
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockUrl);

      // The anchor should have been removed from the DOM
      expect(document.body.contains(appendedAnchor)).toBe(false);

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
      appendChildSpy.mockRestore();
      createElementSpy.mockRestore();
    });

    it('serialises payload with 2-space indentation', async () => {
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:fake');
      const revokeObjectURLSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useImportExport(defaultOptions()),
      );

      const payload = { key: 'value' };

      act(() => {
        result.current.exportJsonFile('out.json', payload);
      });

      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      const text = await blob.text();
      expect(text).toBe(JSON.stringify(payload, null, 2));

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });
});
