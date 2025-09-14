import FDBRequest from "./FDBRequest.js";
import { defineEventHandlerIDLAttribute } from "./lib/defineEventHandlerIDLAttribute.js";

class FDBOpenDBRequest extends FDBRequest {
    public onupgradeneeded!: EventListener | null;
    public onblocked!: EventListener | null;

    get [Symbol.toStringTag]() {
        return "IDBOpenDBRequest";
    }
}

defineEventHandlerIDLAttribute(FDBOpenDBRequest.prototype, "onupgradeneeded");
defineEventHandlerIDLAttribute(FDBOpenDBRequest.prototype, "onblocked");

export default FDBOpenDBRequest;
