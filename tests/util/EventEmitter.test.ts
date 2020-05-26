import { EventEmitter } from "../../src/util/EventEmitter";

describe('EventEmitter works', () => {
  
    it('subscribe works', () => {
        let aRecv = false;
        let bRecv = false;
        
        const emitter = new EventEmitter<string>()
        emitter.subscribe(()=>aRecv=true);
        emitter.subscribe(()=>bRecv=true);

        emitter.emit('test');

        expect(aRecv).toEqual(true);
        expect(bRecv).toEqual(true);
    });

    it('direct unsubscribe works', () => {
        let aRecv = false;
        let bRecv = false;
        
        const emitter = new EventEmitter<string>();
        const lamA: ()=>void = ()=>aRecv=true;
        emitter.subscribe(lamA);
        emitter.subscribe(()=>bRecv=true);
        
        emitter.unsubscribe(lamA);

        emitter.emit('test');

        expect(aRecv).toEqual(false);
        expect(bRecv).toEqual(true);
    });

    it('indirect unsubscribe works', () => {
        let aRecv = false;
        let bRecv = false;
        
        const emitter = new EventEmitter<string>();
        const A = emitter.subscribe(()=>aRecv=true);
        emitter.subscribe(()=>bRecv=true);
        
        A.unsubscribe();

        emitter.emit('test');

        expect(aRecv).toEqual(false);
        expect(bRecv).toEqual(true);
    });
  
  });