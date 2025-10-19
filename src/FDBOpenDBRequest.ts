import FDBRequest from "./FDBRequest.js";

class FDBOpenDBRequest extends FDBRequest {
    public onupgradeneeded: EventListener | null = null;
    public onblocked: EventListener | null = null;

    get [Symbol.toStringTag]() {
        return "IDBOpenDBRequest";
    }
}

export default FDBOpenDBRequest;
