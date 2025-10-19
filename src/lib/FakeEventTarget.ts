import { InvalidStateError } from "./errors.js";
import { defineEventHandlerIDLAttributes } from "./defineEventHandlerIDLAttributes.js";
import type FakeEvent from "./FakeEvent.js";
import type { EventCallback, EventType } from "./types.js";

type EventTypeProp =
    | "onabort"
    | "onblocked"
    | "onclose"
    | "oncomplete"
    | "onerror"
    | "onsuccess"
    | "onupgradeneeded"
    | "onversionchange";

interface Listener {
    callback: EventCallback | EventListenerOrEventListenerObject;
    capture: boolean;
    type: EventType;
}

const stopped = (event: FakeEvent, capture: boolean) => {
    return (
        event.immediatePropagationStopped ||
        (event.eventPhase === Event.CAPTURING_PHASE && !capture) ||
        (event.eventPhase === Event.BUBBLING_PHASE && capture)
    );
};

// http://www.w3.org/TR/dom/#concept-event-listener-invoke
const invokeEventListeners = (event: FakeEvent, obj: FakeEventTarget) => {
    event.currentTarget = obj;

    const errors: Error[] = [];
    const invoke = (
        callback: EventListenerOrEventListenerObject | EventCallback,
    ) => {
        try {
            const listener =
                typeof callback === "function"
                    ? callback
                    : callback.handleEvent;
            // @ts-expect-error The types for the `this` context need tightening here
            listener.call(event.currentTarget, event);
        } catch (err) {
            errors.push(err);
        }
    };

    // The callback might cause obj.listeners to mutate as we traverse it.
    // Take a copy of the array so that nothing sneaks in and we don't lose
    // our place.
    for (const listener of obj.listeners.slice()) {
        if (event.type !== listener.type || stopped(event, listener.capture)) {
            continue;
        }

        invoke(listener.callback);
    }

    const typeToProp: { [key in EventType]: EventTypeProp } = {
        abort: "onabort",
        blocked: "onblocked",
        close: "onclose",
        complete: "oncomplete",
        error: "onerror",
        success: "onsuccess",
        upgradeneeded: "onupgradeneeded",
        versionchange: "onversionchange",
    };
    const prop = typeToProp[event.type];
    if (prop === undefined) {
        throw new Error(`Unknown event type: "${event.type}"`);
    }

    const callback = event.currentTarget[prop];
    if (callback) {
        const listener = {
            callback,
            capture: false,
            type: event.type,
        };
        if (!stopped(event, listener.capture)) {
            invoke(listener.callback);
        }
    }

    // we want to execute all listeners before deciding if we want to throw, because there could be an error thrown by
    // the first listener, but the second should still be invoked
    if (errors.length) {
        throw new AggregateError(errors);
    }
};

abstract class FakeEventTarget extends EventTarget {
    public readonly listeners: Listener[] = [];

    // These will be overridden in individual subclasses and made not readonly
    declare public readonly onabort: EventCallback | null | undefined;
    declare public readonly onblocked: EventCallback | null | undefined;
    declare public readonly onclose: EventCallback | null | undefined;
    declare public readonly oncomplete: EventCallback | null | undefined;
    declare public readonly onerror: EventCallback | null | undefined;
    declare public readonly onsuccess: EventCallback | null | undefined;
    declare public readonly onupgradeneeded: EventCallback | null | undefined;
    declare public readonly onversionchange: EventCallback | null | undefined;

    public addEventListener(
        type: EventType,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions | undefined,
    ) {
        if (!callback) {
            return;
        }

        const capture =
            typeof options === "boolean"
                ? options
                : typeof options === "object" && options
                  ? !!options.capture
                  : false;

        this.listeners.push({
            callback,
            capture,
            type,
        });
    }

    public removeEventListener(
        type: EventType,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions | undefined,
    ) {
        if (!callback) {
            return;
        }

        const capture =
            typeof options === "boolean"
                ? options
                : typeof options === "object" && options
                  ? !!options.capture
                  : false;

        const i = this.listeners.findIndex((listener) => {
            return (
                listener.type === type &&
                listener.callback === callback &&
                listener.capture === capture
            );
        });

        this.listeners.splice(i, 1);
    }

    // http://www.w3.org/TR/dom/#dispatching-events
    public dispatchEvent(event: FakeEvent) {
        if (event.dispatched || !event.initialized) {
            throw new InvalidStateError("The object is in an invalid state.");
        }
        event.isTrusted = false;

        event.dispatched = true;
        event.target = this;
        // NOT SURE WHEN THIS SHOULD BE SET        event.eventPath = [];

        event.eventPhase = Event.CAPTURING_PHASE;
        for (const obj of event.eventPath) {
            if (!event.propagationStopped) {
                invokeEventListeners(event, obj);
            }
        }

        event.eventPhase = Event.AT_TARGET;
        if (!event.propagationStopped) {
            invokeEventListeners(event, event.target);
        }

        if (event.bubbles) {
            event.eventPath.reverse();
            event.eventPhase = Event.BUBBLING_PHASE;
            for (const obj of event.eventPath) {
                if (!event.propagationStopped) {
                    invokeEventListeners(event, obj);
                }
            }
        }

        event.dispatched = false;
        event.eventPhase = Event.NONE;
        event.currentTarget = null;

        if (event.canceled) {
            return false;
        }
        return true;
    }
}

defineEventHandlerIDLAttributes(FakeEventTarget.prototype, [
    "onabort",
    "onclose",
    "onerror",
    "onversionchange",
    "onupgradeneeded",
    "onblocked",
    "oncomplete",
    "onsuccess",
]);

export default FakeEventTarget;
