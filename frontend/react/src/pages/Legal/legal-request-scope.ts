/** Reject responses from old document tabs or superseded requests. */
export class LegalRequestScope {
  private type: string;
  private counter = 0;

  constructor(type: string) { this.type = type; }

  activate(type: string) {
    if (type !== this.type) {
      this.type = type;
      this.counter++;
    }
  }

  start(type: string): number {
    this.activate(type);
    return ++this.counter;
  }

  current(token: number, type: string): boolean {
    return this.counter === token && this.type === type;
  }

  isType(type: string): boolean { return this.type === type; }

  invalidate() { this.counter++; }
}
