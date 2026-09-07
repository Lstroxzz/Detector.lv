'use client';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ArrowRight, Camera, Check, LoaderCircle, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useExperience } from '@/hooks/use-experience';
import { useExperienceTools } from '@/hooks/use-experience-tools';
import { messageAt } from '@/lib/beauty/experience';
import { coverBox } from '@/lib/beauty/movement';
import type { Detection } from '@/lib/beauty/face-detector';
import { Result } from '@/components/beauty/result';

function CameraView({ videoRef, detection, preparing }: { videoRef: RefObject<HTMLVideoElement | null>; detection: Detection; preparing: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(frame); return () => observer.disconnect();
  }, []);
  const video = videoRef.current;
  const box = detection.box && video ? coverBox(detection.box, video.videoWidth, video.videoHeight, size.width, size.height) : null;
  return <div className="camera-frame" ref={frameRef}>
    <div className="mirror"><video ref={videoRef} autoPlay playsInline muted aria-label="Imagem ao vivo da sua câmera"/>
    {box && <div className="face-box" style={{ left: box.x, top: box.y, width: box.width, height: box.height } as CSSProperties}><i/><i/><i/><i/></div>}
    {!preparing && <div className="scan-line"/>}</div>
    <span className="camera-live"><i/> AO VIVO</span>
    {preparing && <div className="preparing-overlay"><LoaderCircle size={24} className="spin"/><span>Preparando a análise...</span></div>}
    {!preparing && <div className="camera-caption">{detection.count > 1 ? 'Deixe só um rosto no quadro.' : detection.box ? 'Rosto detectado' : 'Olhe para a câmera.'}{detection.box && <Check size={14}/>}</div>}
  </div>;
}

export default function Home() {
  const flow = useExperience(); useExperienceTools(flow);
  const container = useRef<HTMLElement>(null);
  useEffect(() => { container.current?.focus({ preventScroll: true }); }, [flow.stage]);
  const activeCamera = ['preparing', 'scanning'].includes(flow.stage) && !flow.offline;
  const scanning = flow.stage === 'scanning';
  const currentMessage = flow.waiting && !flow.offline ? 'Posicione seu rosto no centro.' : messageAt(flow.progress, flow.offline);
  return <main className={`app stage-${flow.stage}`} ref={container} tabIndex={-1}>
    {flow.stage === 'welcome' && <div className="start-screen enter"><Button className="start-button" onClick={flow.openPermission}>Começar <ArrowRight size={18}/></Button></div>}
    {flow.stage === 'permission' && <section className="small-panel enter" aria-labelledby="permission-title"><Camera className="panel-icon" size={30} strokeWidth={1.5}/><h1 id="permission-title">Só um instante.</h1><p>Para realizar a análise, precisamos acessar sua câmera frontal.</p><Button className="solid-button" onClick={flow.allowCamera}>Permitir câmera <ArrowRight size={18}/></Button><Button className="text-button" variant="ghost" onClick={flow.startOffline}>Continuar sem câmera</Button><p className="privacy"><ShieldCheck size={14}/> Nenhuma foto ou vídeo será salvo.</p><button className="back-button" onClick={flow.reset}>Voltar</button></section>}
    {flow.stage === 'requesting' && <section className="small-panel enter" aria-live="polite"><LoaderCircle size={28} className="panel-icon spin"/><h1>Aguardando sua câmera.</h1><p>Permita o acesso na mensagem do navegador.<br/>A câmera será desligada ao terminar.</p><Button variant="ghost" className="text-button" onClick={flow.startOffline}>Continuar sem câmera</Button><button className="back-button" onClick={flow.reset}>Cancelar</button></section>}
    {(activeCamera || scanning) && <section className={`scan-panel enter ${flow.offline ? 'without-camera' : ''}`} aria-label="Análise em andamento">
      <div className="scan-header"><span>{flow.offline ? 'UMA PEQUENA ANÁLISE' : 'ANÁLISE EM ANDAMENTO'}</span><button className="icon-button" onClick={flow.reset} aria-label="Cancelar análise e desligar câmera"><X size={19}/></button></div>
      {activeCamera ? <CameraView videoRef={flow.videoRef} detection={flow.detection} preparing={flow.stage === 'preparing'}/> : <div className="intuition"><div className="intuition-orbit"/><div className="intuition-orbit second"/><span className="intuition-dot"/></div>}
      {scanning && <><div className="scan-status" aria-live="polite"><p key={currentMessage} className={`message enter ${flow.progress >= 78 && flow.progress < 91 ? 'hint' : ''}`}>{currentMessage}</p></div><div className="progress-label"><span>{flow.waiting && !flow.offline ? 'Aguardando um rosto' : flow.progress >= 91 ? 'Quase lá' : 'Analisando'}</span><span>{Math.floor(flow.progress)}%</span></div><Progress value={flow.progress} className="scan-progress" aria-label="Progresso da análise"/>
      <div className="detection-status">{flow.offline ? 'Modo sem câmera · seguindo a intuição' : <><span><i className={flow.detection.box ? 'active-dot' : ''}/>{flow.detection.box ? 'Rosto encontrado' : 'Procurando rosto'}</span><span><i className={flow.detection.moving ? 'active-dot' : ''}/>{flow.detection.moving ? 'Movimento detectado' : 'Acompanhando'}</span></>}</div></>}
      {flow.stage === 'preparing' && <p className="loading-detail" role="status">A primeira análise pode levar alguns segundos.</p>}
      {!flow.offline && <button className="back-button" onClick={flow.startOffline}>Continuar sem câmera</button>}
    </section>}
    {flow.stage === 'fallback' && <section className="small-panel enter" aria-labelledby="fallback-title"><h1 id="fallback-title">Tudo bem.</h1><p className="error-note" role="status">{flow.error}</p><p>Sem câmera, vou ter que confiar no meu próprio sistema de análise...</p><Button className="solid-button" onClick={flow.startOffline}>Continuar <ArrowRight size={18}/></Button><Button variant="ghost" className="text-button" onClick={flow.allowCamera}><RotateCcw size={15}/> Tentar câmera novamente</Button><button className="back-button" onClick={flow.reset}>Voltar ao início</button></section>}
    {flow.stage === 'complete' && <section className="small-panel completion" role="status"><div className="completion-check"><Check size={30}/></div><span className="overline">100%</span><h1>Análise concluída.</h1><p>Encontramos algo especial.</p><Progress value={100} className="scan-progress" aria-label="Análise concluída"/></section>}
    {flow.stage === 'result' && <Result onReset={flow.reset}/>}
  </main>;
}

