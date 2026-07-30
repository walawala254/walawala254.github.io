export const CORE_STATE = Object.freeze({
  quiet: {
    inbound: 0,
    detection: 0,
    anomaly: 0,
    nodes: 0,
    decision: 0
  },
  complete: {
    inbound: 1,
    detection: 1,
    anomaly: 1,
    nodes: 1,
    decision: 1
  }
});

export function createCoreState() {
  return { ...CORE_STATE.quiet };
}

export function setCompleteState(state) {
  Object.assign(state, CORE_STATE.complete);
}
