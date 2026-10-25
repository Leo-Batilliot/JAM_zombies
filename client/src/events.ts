import type { EventEnd, EventStart } from "./net/connection.js";

export interface ArrowPlacement {
  x: number;
  y: number;
  angle: number;
}

export const edgeArrow = (
  dx: number,
  dy: number,
  halfWidth: number,
  halfHeight: number,
  margin: number,
): ArrowPlacement | undefined => {
  if (Math.abs(dx) <= halfWidth && Math.abs(dy) <= halfHeight) {
    return undefined;
  }
  const scale = Math.min(
    dx === 0 ? Infinity : Math.max(halfWidth - margin, 0) / Math.abs(dx),
    dy === 0 ? Infinity : Math.max(halfHeight - margin, 0) / Math.abs(dy),
  );
  return { x: dx * scale, y: dy * scale, angle: Math.atan2(dy, dx) };
};

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const eventMessage = (name: string, end?: EventEnd): string => {
  const subject = capitalize(name);
  if (end === undefined) {
    return `${subject} has appeared!`;
  }
  if (!end.defeated) {
    return `${subject} has vanished.`;
  }
  return end.souls > 0
    ? `${subject} was destroyed! +${String(end.souls)} souls`
    : `${subject} was destroyed!`;
};

export interface ScreenView {
  cameraX: number;
  cameraY: number;
  scale: number;
  width: number;
  height: number;
  margin: number;
}

export class EventDisplay {
  readonly banner = document.createElement("div");
  readonly arrow = document.createElement("div");
  readonly #active = new Map<number, { x: number; y: number }>();
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(root: HTMLElement) {
    this.banner.className = "event-banner";
    this.banner.hidden = true;
    this.arrow.className = "event-arrow";
    this.arrow.hidden = true;
    root.append(this.banner, this.arrow);
  }

  get active(): boolean {
    return this.#active.size > 0;
  }

  get positions(): { x: number; y: number }[] {
    return [...this.#active.values()];
  }

  start(start: EventStart, name: string, announceMs: number): void {
    this.#active.set(start.event, { x: start.x, y: start.y });
    this.#announce(eventMessage(name), announceMs);
  }

  end(end: EventEnd, name: string, announceMs: number): void {
    this.#active.delete(end.event);
    this.#announce(eventMessage(name, end), announceMs);
  }

  #announce(text: string, announceMs: number): void {
    this.banner.textContent = text;
    this.banner.hidden = false;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.banner.hidden = true;
    }, announceMs);
  }

  update(view: ScreenView): void {
    let nearest: ArrowPlacement | undefined;
    let nearestDistance = Infinity;
    for (const { x, y } of this.#active.values()) {
      const dx = (x - view.cameraX) * view.scale;
      const dy = (y - view.cameraY) * view.scale;
      const placement = edgeArrow(
        dx,
        dy,
        view.width / 2,
        view.height / 2,
        view.margin,
      );
      const distance = Math.hypot(dx, dy);
      if (placement !== undefined && distance < nearestDistance) {
        nearest = placement;
        nearestDistance = distance;
      }
    }
    this.arrow.hidden = nearest === undefined;
    if (nearest !== undefined) {
      this.arrow.style.left = `${String(view.width / 2 + nearest.x)}px`;
      this.arrow.style.top = `${String(view.height / 2 + nearest.y)}px`;
      this.arrow.style.transform = `translate(-50%, -50%) rotate(${String(nearest.angle)}rad)`;
    }
  }
}
