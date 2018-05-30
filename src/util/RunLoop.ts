type TickListener = (dt: number) => void;

class RunLoop {
  private _onTick?: TickListener;
  private _stopped: boolean = false;

  start() {
    this._stopped = false;

    let lastTickMs = Date.now();

    const nextTick = () => {
      if (this._stopped) {
        return;
      }

      if (!this._onTick) {
        throw new Error(`no onTick() callback set for run loop`);
      }

      const now = Date.now();
      const dt = now - lastTickMs;
      lastTickMs = now;

      this._onTick(dt);

      requestAnimationFrame(nextTick);
    };

    requestAnimationFrame(nextTick);
  }

  stop() {
    this._stopped = true;
  }

  onTick(listener: TickListener) {
    this._onTick = listener;
  }
}

export default RunLoop;
