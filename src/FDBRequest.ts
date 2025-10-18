import { InvalidStateError } from "./lib/errors.js";
import { defineEventHandlerIDLAttribute } from "./lib/defineEventHandlerIDLAttribute.js";
import FakeEventTarget from "./lib/FakeEventTarget.js";
import type FDBCursor from "./FDBCursor.js";
import type FDBIndex from "./FDBIndex.js";
import type FDBObjectStore from "./FDBObjectStore.js";
import type FDBTransaction from "./FDBTransaction.js";

class FDBRequest extends FakeEventTarget {
    public _result: any = null;
    public _error: Error | null | undefined = null;
    public source: FDBCursor | FDBIndex | FDBObjectStore | null = null;
    public transaction: FDBTransaction | null = null;
    public readyState: "done" | "pending" = "pending";
    public onsuccess!: EventListener | null;
    public onerror!: EventListener | null;

    public get error() {
        if (this.readyState === "pending") {
            throw new InvalidStateError();
        }
        return this._error;
    }

    public set error(value: any) {
        this._error = value;
    }

    public get result() {
        if (this.readyState === "pending") {
            throw new InvalidStateError();
        }
        return this._result;
    }

    public set result(value: any) {
        this._result = value;
    }

    get [Symbol.toStringTag]() {
        return "IDBRequest";
    }
}

defineEventHandlerIDLAttribute(FDBRequest.prototype, "onsuccess");
defineEventHandlerIDLAttribute(FDBRequest.prototype, "onerror");

export default FDBRequest;
