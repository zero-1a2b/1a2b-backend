

export class RepeatedTimer {

  private timer: NodeJS.Timeout | null;

  constructor(
    private readonly time: number,
    private readonly repeated: boolean,
    private readonly onTimeout: () => void
  ) {}


  start(): void {
    this.stop();
    this.timer = setTimeout(()=>{
      this.onTimeout();
      if(this.repeated) {
        this.start();
      }
    }, this.time);
  }

  stop(): void {
    if(this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  reset(): void {
    this.start();
  }

}
