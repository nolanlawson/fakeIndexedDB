const listenersToWrappedListeners = new WeakMap<
    EventListenerOrEventListenerObject,
    EventListener
>();

/**
 * Same as EventTarget but gives us a way to observe errors thrown by listeners.
 * Without this, there's no way for us to have error handling while also using
 * native Event/EventTarget.
 */
export default class FakeEventTarget extends EventTarget {
    public _errorHandler: ((err: Error) => void) | null = null;

    public addEventListener(
        type: string,
        callbackOrListenersObject: EventListenerOrEventListenerObject | null,
        options?: AddEventListenerOptions | boolean,
    ) {
        if (!callbackOrListenersObject) {
            throw new Error("Must supply a callback");
        }

        const callback =
            typeof callbackOrListenersObject === "function"
                ? callbackOrListenersObject
                : callbackOrListenersObject.handleEvent;

        let wrappedCallback = listenersToWrappedListeners.get(
            callbackOrListenersObject,
        );
        if (!wrappedCallback) {
            wrappedCallback = (result) => {
                try {
                    callback(result);
                } catch (err) {
                    if (this._errorHandler) {
                        this._errorHandler(err);
                    } else {
                        throw err;
                    }
                }
            };
            listenersToWrappedListeners.set(
                callbackOrListenersObject,
                wrappedCallback,
            );
        }
        super.addEventListener(type, wrappedCallback, options);
    }

    public removeEventListener(
        type: string,
        callbackOrListenersObject: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean,
    ) {
        if (!callbackOrListenersObject) {
            throw new Error("Must supply a callback");
        }

        const wrappedCallback =
            listenersToWrappedListeners.get(callbackOrListenersObject) ?? null;
        super.removeEventListener(type, wrappedCallback, options);
    }
}

// just to make sure we don't forget to define the ones we need
for (const event of [
    "abort",
    "blocked",
    "close",
    "complete",
    "error",
    "success",
    "upgradeneeded",
    "versionchange",
]) {
    Object.defineProperty(FakeEventTarget.prototype, `on${event}`, {
        get() {
            throw new Error(`on${event} must be defined`);
        },
        set() {
            throw new Error(`on${event} must be defined`);
        },
    });
}
