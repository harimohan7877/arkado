type SettingsObject = Record<string, unknown>;

export function isSettingsObject(value: unknown): value is SettingsObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Only submit values the editor changed. Arrays are edited as one field. */
export function diffSettings(previous: SettingsObject, next: SettingsObject): SettingsObject {
  const entries: [string, unknown][] = [];
  for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    if (!Object.hasOwn(next, key)) {
      entries.push([key, null]);
      continue;
    }
    const before = previous[key];
    const after = next[key];
    if (isSettingsObject(before) && isSettingsObject(after)) {
      const patch = diffSettings(before, after);
      if (Object.keys(patch).length) entries.push([key, patch]);
    } else if (JSON.stringify(before) !== JSON.stringify(after)) {
      entries.push([key, after]);
    }
  }
  return Object.fromEntries(entries);
}

/** Merge changed fields into the latest document. A null patch removes a key. */
export function applySettingsPatch(current: SettingsObject, patch: SettingsObject): SettingsObject {
  const entries = new Map(Object.entries(current));
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      entries.delete(key);
    } else if (isSettingsObject(value)) {
      const previous = entries.get(key);
      entries.set(key, applySettingsPatch(isSettingsObject(previous) ? previous : {}, value));
    } else {
      entries.set(key, value);
    }
  }
  return Object.fromEntries(entries);
}
