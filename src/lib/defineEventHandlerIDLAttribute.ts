import type { EventType } from "./types.js";

// https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-idl-attributes
export function defineEventHandlerIDLAttribute<
    T extends EventTarget,
    N extends keyof T & `on${EventType}`,
>(target: T, name: N) {
    const eventName = name.substring(2); // remove leading 'on'
    const targetToValue = new WeakMap<EventTarget, EventListener | null>();
    Object.defineProperty(target, name, {
        get() {
            return targetToValue.get(this) ?? null;
        },
        set(newValue: EventListener | null) {
            const value = targetToValue.get(this);
            if (value !== null && value !== undefined) {
                this.removeEventListener(eventName, value);
            }
            if (newValue !== null && newValue !== undefined) {
                this.addEventListener(eventName, newValue);
            }
            targetToValue.set(this, newValue);
        },
        configurable: true,
        enumerable: true,
    });
}
