'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceDetector } from '@mediapipe/tasks-vision';
import { attachVideo, friendlyCameraError, requestCamera, stopStream } from '@/lib/beauty/camera';
import { createFaceDetector, watchFace, type Detection } from '@/lib/beauty/face-detector';
import { progressAt, type Stage } from '@/lib/beauty/experience';
const emptyDetection: Detection = { box: null, moving: false, count: 0 };
export function useExperience() {
  const [stage, setStage] = useState<Stage>('welcome');
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [detection, setDetection] = useState<Detection>(emptyDetection);
  const [waiting, setWaiting] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const detector = useRef<FaceDetector | null>(null);
  const stopWatching = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const lastFace = useRef(-Infinity);
  const activeStage = useRef(stage);
  const busy = useRef(false);
  activeStage.current = stage;
  const cleanup = useCallback(() => {
    generation.current += 1;
    stopWatching.current?.(); stopWatching.current = null;
    stopStream(stream.current); stream.current = null;
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
    detector.current?.close(); detector.current = null;
    busy.current = false;
  }, []);
  const fail = useCallback((message: string) => {
    cleanup(); setError(message); setDetection(emptyDetection); setStage('fallback');
  }, [cleanup]);
  const reset = useCallback(() => {
    cleanup(); setOffline(false); setProgress(0); setDetection(emptyDetection); setError(''); setWaiting(true); setStage('welcome');
  }, [cleanup]);
  const startOffline = useCallback(() => {
    cleanup(); setOffline(true); setProgress(0); setDetection(emptyDetection); setWaiting(false); setStage('scanning');
  }, [cleanup]);
  const allowCamera = useCallback(async () => {
    if (busy.current) return;
    cleanup(); busy.current = true;
    const run = generation.current;
    setOffline(false); setError(''); setProgress(0); setDetection(emptyDetection); setWaiting(true); lastFace.current = -Infinity; setStage('requesting');
    try {
      const media = await requestCamera();
      if (generation.current !== run) { stopStream(media); return; }
      stream.current = media;
      const track = media.getVideoTracks()[0];
      track.addEventListener('ended', () => { if (stream.current === media) fail('A câmera foi desconectada. Você pode tentar de novo ou continuar sem câmera.'); }, { once: true });
      setStage('preparing');
    } catch (err) { if (generation.current === run) fail(friendlyCameraError(err)); }
  }, [cleanup, fail]);
  useEffect(() => {
    if (stage !== 'preparing' || !videoRef.current || !stream.current) return;
    let cancelled = false;
    const run = generation.current;
    const initialize = async () => {
      try {
        await attachVideo(videoRef.current!, stream.current!);
        if (cancelled || run !== generation.current) return;
        const model = await createFaceDetector();
        if (cancelled || run !== generation.current) { model.close(); return; }
        detector.current = model;
        stopWatching.current = watchFace(model, videoRef.current!, result => {
          setDetection(result);
          if (result.box) lastFace.current = performance.now();
        }, () => fail('A detecção teve uma pausa inesperada. Tente novamente ou continue com a nossa intuição.'));
        busy.current = false; setStage('scanning');
      } catch (err) { if (!cancelled && generation.current === run) fail(err instanceof Error && /câmera/.test(err.message) ? err.message : 'Não conseguimos iniciar a detecção facial. Tente novamente ou continue sem câmera.'); }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [stage, fail]);
  useEffect(() => {
    if (stage !== 'scanning') return;
    let elapsed = 0;
    let previous = performance.now();
    let lastActive = previous;
    const timer = setInterval(() => {
      const now = performance.now();
      const active = offline || now - lastFace.current < 1100;
      setWaiting(!active);
      if (active) { elapsed += Math.min(now - previous, 300); lastActive = now; }
      previous = now;
      const percent = progressAt(elapsed); setProgress(percent);
      if (!active && now - lastActive > 15000) {
        clearInterval(timer); fail('Não conseguimos localizar um rosto por aqui. Procure um lugar mais iluminado e tente de novo, ou continue sem câmera.');
      } else if (percent >= 100) {
        clearInterval(timer); cleanup(); setDetection(emptyDetection); setStage('complete');
      }
    }, 100);
    return () => clearInterval(timer);
  }, [stage, offline, cleanup, fail]);
  useEffect(() => {
    if (stage !== 'complete') return;
    const timeout = setTimeout(() => setStage('result'), 2400);
    return () => clearTimeout(timeout);
  }, [stage]);
  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden && ['requesting','preparing','scanning'].includes(activeStage.current)) fail('Pausamos a experiência enquanto você estava fora. A câmera foi desligada. Vamos tentar de novo?');
    };
    const pageExit = () => { cleanup(); };
    const pageReturn = (event: PageTransitionEvent) => { if (event.persisted && ['requesting','preparing','scanning'].includes(activeStage.current)) fail('A experiência foi pausada e a câmera está desligada. Você pode recomeçar.'); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    window.addEventListener('pagehide', pageExit); window.addEventListener('pageshow', pageReturn);
    return () => { document.removeEventListener('visibilitychange', stopWhenHidden); window.removeEventListener('pagehide', pageExit); window.removeEventListener('pageshow', pageReturn); cleanup(); };
  }, [cleanup, fail]);
  return { stage, offline, error, progress, detection, waiting, videoRef, reset, startOffline, allowCamera, openPermission: () => setStage('permission') };
}
