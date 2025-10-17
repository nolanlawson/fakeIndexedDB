export default class FakeEvent extends Event {
    public _propagationStopped = false;
    public _immediatePropagationStopped = false;
    public _canceled = false;

    public stopPropagation() {
        this._propagationStopped = true;
        super.stopPropagation();
    }

    public stopImmediatePropagation() {
        this._immediatePropagationStopped = true;
        super.stopImmediatePropagation();
    }

    public preventDefault() {
        this._canceled = true;
        super.preventDefault();
    }
}
