import type { EventType } from "./types.js";

// https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-idl-attributes
export function defineEventHandlerIDLAttribute<
    T extends EventTarget,
    N extends keyof T & `on${EventType}`,
>(target: T, name: N) {
    const eventName = name.substring(2); // remove leading 'on'
    let value: EventListener | null = null;
    Object.defineProperty(target, name, {
        get() {
            return value;
        },
        set(newValue: EventListener | null) {
            if (
                (newValue === null || newValue === undefined) &&
                value !== null &&
                value !== undefined
            ) {
                this.removeEventListener(eventName, value);
            }
            if (newValue !== null && newValue !== undefined) {
                this.addEventListener(eventName, newValue);
            }
            value = newValue;
        },
        configurable: true,
        enumerable: true,
    });
}
