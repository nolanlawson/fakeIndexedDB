import type FakeEventTarget from "./FakeEventTarget.js";

// Same as `EventTarget#dispatchEvent` but allows for error handling for errors thrown from listeners
export default function dispatchEventWithErrorHandling(
    target: FakeEventTarget,
    event: Event,
) {
    const errors: Error[] = [];
    target._errorHandler = (err) => {
        errors.push(err);
    };
    try {
        target.dispatchEvent(event);
    } finally {
        target._errorHandler = null;
    }
    if (errors.length) {
        throw new AggregateError(errors);
    }
}
