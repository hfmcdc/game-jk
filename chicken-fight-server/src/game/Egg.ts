export class Egg {
  id: string;
  x: number;
  y: number;
  isGolden: boolean;
  value: number;

  constructor(id: string, x: number, y: number, isGolden: boolean = false) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.isGolden = isGolden;
    this.value = isGolden ? 2 : 1;
  }

  getState() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      isGolden: this.isGolden,
      value: this.value
    };
  }
}
