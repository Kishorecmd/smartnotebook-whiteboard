import { GestureState } from './GestureState';

export class GestureStateMachine {
  private state = GestureState.IDLE;

  public getState(): GestureState { return this.state; }
  public transition(next: GestureState): GestureState {
    this.state = next;
    return this.state;
  }
  public reset(): void { this.state = GestureState.IDLE; }
}
