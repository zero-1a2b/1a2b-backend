export type EventListener<T> = (T)=>void

export class Subscription {
    
    constructor(
        readonly emitter: EventEmitter<unknown>,
        readonly listener: EventListener<unknown>
    ){}

    unsubscribe(): void {
        this.emitter.unsubscribe(this.listener);
    }

}

export class EventEmitter<T> {

    get listeners(): Set<EventListener<T>> { return this._listeners; }
    private _listeners: Set<EventListener<T>>

    constructor() {
        this._listeners = new Set()
    }

    subscribe(listener: EventListener<T>): Subscription {
        this._listeners.add(listener)
        return new Subscription(this, listener)
    }

    unsubscribe(listener: EventListener<T>): void {
        this._listeners.delete(listener);
    }

    emit(event: T): void {
        this.listeners.forEach(v=>v(event))
    }

}