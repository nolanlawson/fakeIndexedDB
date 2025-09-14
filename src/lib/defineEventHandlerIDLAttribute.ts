// https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-idl-attributes
export function defineEventHandlerIDLAttribute<
    T extends EventTarget,
    N extends keyof T & string,
>(target: T, name: N) {
    const eventName = name.substring(2); // remove leading 'on'
    let value: EventListener | null = null;
    let wrapper: EventListener | null = null;
    Object.defineProperty(target, name, {
        get() {
            return value;
        },
        set(newValue: EventListener | null) {
            if (newValue === null || newValue === undefined) {
                if (wrapper !== null) {
                    this.removeEventListener(eventName, wrapper);
                }
                wrapper = null;
            } else {
                if (wrapper === null) {
                    wrapper = (...args) => value!.apply(this, args);
                    this.addEventListener(eventName, wrapper);
                }
            }
            value = newValue;
        },
        configurable: true,
        enumerable: true,
    });
}
