const RESERVED_STATE_KEYS = new Set(['transactions', 'activityLog']);

function clone(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

export function stateProperties(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return {};
  return Object.fromEntries(
    Object.entries(state)
      .filter(([key]) => !RESERVED_STATE_KEYS.has(key))
      .map(([key, value]) => [key, clone(value)]),
  );
}

export function sameStateProperties(left, right) {
  try {
    return JSON.stringify(canonical(stateProperties(left))) === JSON.stringify(canonical(stateProperties(right)));
  } catch {
    return false;
  }
}

export function changedStateProperties(previous, next) {
  const before = stateProperties(previous);
  const after = stateProperties(next);
  return Object.fromEntries(
    Object.entries(after).filter(([key, value]) => {
      try {
        return JSON.stringify(canonical(before[key])) !== JSON.stringify(canonical(value));
      } catch {
        return true;
      }
    }),
  );
}

export function matchesStateProperties(state, expectedProperties) {
  const actual = stateProperties(state);
  const expected = stateProperties(expectedProperties);
  try {
    return Object.entries(expected).every(([key, value]) => (
      JSON.stringify(canonical(actual[key])) === JSON.stringify(canonical(value))
    ));
  } catch {
    return false;
  }
}

export function applyStateProperties(state, properties) {
  const base = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  return { ...base, ...stateProperties(properties) };
}
