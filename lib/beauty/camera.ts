// A request can outlive its timeout: always dispose a late stream/resource.
export async function withTimeout<T>(task: Promise<T>, ms: number, message: string, dispose?: (value: T) => void): Promise<T> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guarded = task.then(value => {
    if (expired) { dispose?.(value); throw new Error(message); }
    return value;
  });
  try {
    return await Promise.race([guarded, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { expired = true; reject(new Error(message)); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}
export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop());
}
export async function requestCamera() {
  if (!window.isSecureContext) throw new Error('A câmera precisa de uma conexão segura. Abra o link com HTTPS ou continue sem câmera.');
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador não consegue abrir a câmera. Tente o Safari ou Chrome atualizado, ou continue sem câmera.');
  return withTimeout(navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
  }), 25000, 'A permissão demorou um pouquinho. Você pode tentar novamente ou continuar sem câmera.', stopStream);
}
export async function attachVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  await withTimeout(video.play(), 12000, 'Não conseguimos iniciar a imagem da câmera. Tente novamente ou continue sem câmera.');
}
export function friendlyCameraError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'O acesso à câmera não foi permitido. Você pode liberar a câmera nas configurações do navegador ou continuar sem ela.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Não encontramos uma câmera neste dispositivo. Mas a surpresa continua disponível.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'A câmera pode estar em uso por outro aplicativo. Feche-o e tente novamente, ou continue sem câmera.';
  if (name === 'OverconstrainedError') return 'Essa câmera não conseguiu iniciar. Tente novamente ou continue sem câmera.';
  if (name === 'SecurityError') return 'O navegador bloqueou a câmera nesta página. Abra o link diretamente no Safari ou Chrome, ou continue sem câmera.';
  return error instanceof Error ? error.message : 'Não conseguimos abrir a câmera agora. Você ainda pode continuar sem ela.';
}
