export interface StoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function saveToPort(port: StoragePort, key: string, json: string): void {
  port.set(key, json);
}

export function loadFromPort(port: StoragePort, key: string): string | null {
  return port.get(key);
}
