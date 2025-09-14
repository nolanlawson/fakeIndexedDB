export default class FakeEvent extends Event {
    propagationStopped = false;
    immediatePropagationStopped = false;
    canceled = false;

    stopPropagation() {
        this.propagationStopped = true;
        super.stopPropagation();
    }

    stopImmediatePropagation() {
        this.immediatePropagationStopped = true;
        super.stopImmediatePropagation();
    }

    preventDefault() {
        this.canceled = true;
        super.preventDefault();
    }
}
