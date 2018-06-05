interface Timer {
  elapsedMs: number;
  timerMs: number;
  update: (elapsedMs: number, timerMs: number) => void;
}

/**
 * these "timers" are meant to be used to do things like lerping over time
 * they don't hold any state other than the amount of time that has elapsed since instantiating,
 * which gets passed to an update hook
 * there might be a better term than this for "Timer" but fuck if I know what it is
 */
export default class TimerManager {
  timers = new Set<Timer>();

  create(timer: Timer) {
    this.timers.add(timer);
  }

  update(dt: number) {
    for (let timer of this.timers) {
      timer.elapsedMs += dt;

      if (timer.elapsedMs > timer.timerMs) {
        timer.elapsedMs = timer.timerMs;
        this.timers.delete(timer);
      }

      timer.update(timer.elapsedMs, timer.timerMs);
    }
  }
}
