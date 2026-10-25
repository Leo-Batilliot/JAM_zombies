import type { ClientConfig } from "@horde/shared";

type CameraSettings = ClientConfig["client"]["camera"];

export const zoomFor = (strength: number, camera: CameraSettings): number =>
  Math.max(
    camera.minZoom,
    1 /
      (1 +
        camera.factor *
          Math.log1p(Math.max(strength, 0) / camera.strengthScale)),
  );

export const easeZoom = (
  current: number,
  target: number,
  camera: CameraSettings,
): number => current + (target - current) * camera.smoothing;
