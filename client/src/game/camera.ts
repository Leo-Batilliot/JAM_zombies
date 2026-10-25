import type { ClientConfig } from "@horde/shared";

type CameraSettings = ClientConfig["client"]["camera"];

export const zoomFor = (strength: number, camera: CameraSettings): number =>
  camera.baseZoom *
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

export const isSmallScreen = (
  width: number,
  height: number,
  camera: CameraSettings,
): boolean => Math.min(width, height) < camera.smallScreen;

export const screenZoom = (
  width: number,
  height: number,
  camera: CameraSettings,
): number =>
  isSmallScreen(width, height, camera) ? camera.smallScreenZoom : 1;
