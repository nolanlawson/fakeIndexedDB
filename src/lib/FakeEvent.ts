import type FakeEventTarget from "./FakeEventTarget.js";
import type { EventType } from "./types.js";

class FakeEvent extends Event {
    public eventPath: FakeEventTarget[] = [];

    public readonly type!: EventType;

    // Flags
    public propagationStopped = false;
    public immediatePropagationStopped = false;
    public canceled = false;
    public initialized = true;
    public dispatched = false;

    public target: FakeEventTarget | null = null;
    public currentTarget: FakeEventTarget | null = null;

    public eventPhase: 0 | 1 | 2 | 3 = 0;

    public defaultPrevented = false;

    public isTrusted = false;
    public timeStamp = Date.now();

    constructor(
        type: EventType,
        eventInitDict: { bubbles?: boolean; cancelable?: boolean } = {},
    ) {
        super(type, eventInitDict);
    }

    public preventDefault() {
        if (this.cancelable) {
            this.canceled = true;
        }
    }

    public stopPropagation() {
        this.propagationStopped = true;
    }

    public stopImmediatePropagation() {
        this.propagationStopped = true;
        this.immediatePropagationStopped = true;
    }
}

export default FakeEvent;
