const steps = 0xffff;

export interface Bounds {
  width: number;
  height: number;
}

const quantize = (value: number, size: number): number =>
  Math.round((Math.min(Math.max(value, 0), size) / size) * steps);

const dequantize = (value: number, size: number): number =>
  (value / steps) * size;

export const quantizeX = (x: number, bounds: Bounds): number =>
  quantize(x, bounds.width);

export const quantizeY = (y: number, bounds: Bounds): number =>
  quantize(y, bounds.height);

export const dequantizeX = (x: number, bounds: Bounds): number =>
  dequantize(x, bounds.width);

export const dequantizeY = (y: number, bounds: Bounds): number =>
  dequantize(y, bounds.height);
