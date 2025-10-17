import type FakeEvent from "./FakeEvent.js";

export function dispatchBubblingEvent(
    target: EventTarget,
    event: FakeEvent,
    ancestors: EventTarget[],
) {
    target.dispatchEvent(event);

    for (const ancestor of ancestors) {
        if (event._propagationStopped || event._immediatePropagationStopped) {
            return;
        }
        ancestor.dispatchEvent(event);
    }
}
