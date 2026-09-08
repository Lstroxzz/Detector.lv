import { withTimeout } from './camera';
import { MovementTracker, type Box } from './movement';
import type { FaceDetector } from '@mediapipe/tasks-vision';
export type Detection = { box: Box | null; moving: boolean; count: number };
export async function createFaceDetector() {
  const initialization = (async () => {
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const base = document.baseURI;
    const files = await FilesetResolver.forVisionTasks(new URL('mediapipe/wasm', base).href);
    return FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: new URL('models/blaze_face_short_range.tflite', base).href, delegate: 'CPU' },
      runningMode: 'VIDEO', minDetectionConfidence: .6,
    });
  })();
  return withTimeout(initialization, 18000, 'A detecção não carregou. Confira sua conexão, tente novamente ou continue sem câmera.', detector => detector.close());
}
export function watchFace(detector: FaceDetector, video: HTMLVideoElement, onResult: (result: Detection) => void, onError: () => void) {
  const movement = new MovementTracker();
  let lastFrame = -1;
  let lastRun = 0;
  let frame = 0;
  let stopped = false;
  let staleCleared = false;
  const tick = (now: number) => {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth && now - lastRun >= 100 && video.currentTime !== lastFrame) {
      lastFrame = video.currentTime; lastRun = now; staleCleared = false;
      try {
        const detections = detector.detectForVideo(video, now).detections;
        const largest = [...detections].sort((a, b) => ((b.boundingBox?.width ?? 0) * (b.boundingBox?.height ?? 0)) - ((a.boundingBox?.width ?? 0) * (a.boundingBox?.height ?? 0)))[0];
        const bounds = largest?.boundingBox;
        const box = bounds ? { x: bounds.originX / video.videoWidth, y: bounds.originY / video.videoHeight, width: bounds.width / video.videoWidth, height: bounds.height / video.videoHeight } : null;
        onResult({ box, moving: movement.update(box, now), count: detections.length });
      } catch { stopped = true; onError(); return; }
    }
    if (!staleCleared && now - lastRun > 500) { staleCleared = true; onResult({ box: null, moving: false, count: 0 }); }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => { stopped = true; cancelAnimationFrame(frame); };
}
