export type Stage = 'welcome' | 'permission' | 'requesting' | 'preparing' | 'scanning' | 'complete' | 'result' | 'fallback';
export const SCAN_DURATION = 26000;
export const timeline = [
  [0, 'Inicializando análise...'], [5, 'Localizando pessoa...'],
  [12, 'Rosto detectado.'], [18, 'Analisando características...'],
  [28, 'Analisando nível de beleza...'], [40, 'Comparando resultados...'],
  [50, 'Calculando...'], [60, 'Processando dados...'],
  [70, 'Resultado quase pronto...'], [78, 'Erro inesperado...'],
  [83, 'Beleza acima do limite permitido.'], [91, 'Recalculando...'],
  [97, 'Resultado confirmado.'],
] as const;
export function progressAt(elapsed: number) {
  return Math.max(0, Math.min(100, (elapsed / SCAN_DURATION) * 100));
}
export function messageAt(progress: number, offline = false) {
  const item = [...timeline].reverse().find(([p]) => progress >= p) ?? timeline[0];
  if (offline && item[0] === 5) return 'Ativando o sexto sentido...';
  if (offline && item[0] === 12) return 'Intuição conectada.';
  if (offline && item[0] === 18) return 'Reunindo boas energias...';
  return item[1];
}
