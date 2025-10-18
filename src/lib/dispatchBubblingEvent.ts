import dispatchEventWithErrorHandling from "./dispatchEventWithErrorHandling.js";
import type FakeEventTarget from "./FakeEventTarget.js";
import type FakeEvent from "./FakeEvent.js";

// Dispatch an event that bubbles, similar to how the browser would
export function dispatchBubblingEvent(
    target: FakeEventTarget,
    event: FakeEvent,
    ancestors: FakeEventTarget[],
) {
    dispatchEventWithErrorHandling(target, event);

    for (const ancestor of ancestors) {
        if (event._propagationStopped || event._immediatePropagationStopped) {
            return;
        }
        dispatchEventWithErrorHandling(ancestor, event);
    }
}
