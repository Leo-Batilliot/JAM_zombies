interface GridItem {
  id: number;
  x: number;
  y: number;
  cell: number;
}

const cellOffset = 0x8000;

export class SpatialGrid {
  readonly #cells = new Map<number, Set<GridItem>>();
  readonly #items = new Map<number, GridItem>();

  constructor(readonly cellSize: number) {}

  #coord(value: number): number {
    return Math.floor(value / this.cellSize) + cellOffset;
  }

  #key(cx: number, cy: number): number {
    return cx * 0x10000 + cy;
  }

  #cellOf(x: number, y: number): number {
    return this.#key(this.#coord(x), this.#coord(y));
  }

  #addToCell(item: GridItem): void {
    let items = this.#cells.get(item.cell);
    if (items === undefined) {
      items = new Set();
      this.#cells.set(item.cell, items);
    }
    items.add(item);
  }

  #removeFromCell(item: GridItem): void {
    const items = this.#cells.get(item.cell);
    items?.delete(item);
    if (items?.size === 0) {
      this.#cells.delete(item.cell);
    }
  }

  get size(): number {
    return this.#items.size;
  }

  insert(id: number, x: number, y: number): void {
    if (this.#items.has(id)) {
      this.update(id, x, y);
      return;
    }
    const item = { id, x, y, cell: this.#cellOf(x, y) };
    this.#items.set(id, item);
    this.#addToCell(item);
  }

  update(id: number, x: number, y: number): void {
    const item = this.#items.get(id);
    if (item === undefined) {
      this.insert(id, x, y);
      return;
    }
    const cell = this.#cellOf(x, y);
    if (cell !== item.cell) {
      this.#removeFromCell(item);
      item.cell = cell;
      this.#addToCell(item);
    }
    item.x = x;
    item.y = y;
  }

  remove(id: number): void {
    const item = this.#items.get(id);
    if (item === undefined) {
      return;
    }
    this.#removeFromCell(item);
    this.#items.delete(id);
  }

  queryRect(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    out: number[] = [],
  ): number[] {
    const startX = this.#coord(minX);
    const endX = this.#coord(maxX);
    const startY = this.#coord(minY);
    const endY = this.#coord(maxY);
    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const items = this.#cells.get(this.#key(cx, cy));
        if (items === undefined) {
          continue;
        }
        for (const item of items) {
          if (
            item.x >= minX &&
            item.x <= maxX &&
            item.y >= minY &&
            item.y <= maxY
          ) {
            out.push(item.id);
          }
        }
      }
    }
    return out;
  }

  queryRadius(
    x: number,
    y: number,
    radius: number,
    out: number[] = [],
  ): number[] {
    const startX = this.#coord(x - radius);
    const endX = this.#coord(x + radius);
    const startY = this.#coord(y - radius);
    const endY = this.#coord(y + radius);
    const radiusSquared = radius * radius;
    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const items = this.#cells.get(this.#key(cx, cy));
        if (items === undefined) {
          continue;
        }
        for (const item of items) {
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= radiusSquared) {
            out.push(item.id);
          }
        }
      }
    }
    return out;
  }
}
