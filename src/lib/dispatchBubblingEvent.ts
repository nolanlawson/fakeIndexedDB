import dispatchEventWithErrorHandling from "./dispatchEventWithErrorHandling.js";
import type FakeEventTarget from "./FakeEventTarget.js";
import type FakeEvent from "./FakeEvent.js";

// Dispatch an event that bubbles, similar to how the browser would
export function dispatchBubblingEvent(
    target: FakeEventTarget,
    event: FakeEvent,
    ancestors: FakeEventTarget[],
) {
    // target never changes when bubbling, only currentTarget does
    Object.defineProperty(event, "target", {
        writable: false,
        value: target,
    });
    dispatchEventWithErrorHandling(target, event);

    Object.defineProperty(event, "eventPhase", {
        writable: true,
        configurable: true,
        value: Event.BUBBLING_PHASE,
    });
    for (const ancestor of ancestors) {
        if (event._propagationStopped || event._immediatePropagationStopped) {
            return;
        }
        Object.defineProperty(event, "currentTarget", {
            writable: true,
            configurable: true,
            value: ancestor,
        });
        dispatchEventWithErrorHandling(ancestor, event);
    }
}
