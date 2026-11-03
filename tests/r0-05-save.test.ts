import { describe, it, expect } from 'vitest';
import {
  serialize,
  deserialize,
  importSave,
  exportSave,
  UnknownSaveVersionError,
  SAVE_VERSION,
} from '../src/core/save/save';
import { saveToPort, loadFromPort, type StoragePort } from '../src/core/save/storage';
import { initialState, reduce } from '../src/core/run/state';

function sampleState() {
  let s = initialState();
  s = reduce(s, { type: 'START_RUN', seed: 777 });
  return s;
}

function memoryPort(): StoragePort {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

describe('R0-05 versioned save', () => {
  it('save -> load -> identical state', () => {
    const state = sampleState();
    const json = serialize(state);
    expect(deserialize(json)).toEqual(state);
  });

  it('export/import JSON round-trip', () => {
    const state = sampleState();
    expect(importSave(exportSave(state))).toEqual(state);
  });

  it('rejects an unknown (future) version cleanly', () => {
    const bad = JSON.stringify({ version: SAVE_VERSION + 1, state: sampleState() });
    expect(() => deserialize(bad)).toThrow(UnknownSaveVersionError);
  });

  it('rejects a payload without version', () => {
    expect(() => deserialize(JSON.stringify({ state: {} }))).toThrow(/version/);
  });

  it('works through an injected StoragePort', () => {
    const port = memoryPort();
    const state = sampleState();
    saveToPort(port, 'riftforge-save', serialize(state));
    const loaded = loadFromPort(port, 'riftforge-save');
    expect(loaded).not.toBeNull();
    expect(deserialize(loaded!)).toEqual(state);
  });
});
