'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Heart, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function Result({ onReset }: { onReset: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [setTimeout(() => setStep(1), 1700), setTimeout(() => setStep(2), 3300), setTimeout(() => setStep(3), 6000)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return <section className="result-screen enter" aria-label="Resultado da análise">
    {step >= 1 && <div className="hearts" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <Heart key={i} fill="currentColor" strokeWidth={0} style={{ '--x': `${(i * 37 + 5) % 101}%`, '--size': `${12 + (i * 13) % 28}px`, '--duration': `${7 + i % 7}s`, '--delay': `${(i * .43) % 10}s`, '--drift': `${(i % 2 ? 1 : -1) * (20 + i % 50)}px` } as CSSProperties}/>)}</div>}
    <div className="result-copy"><p className="overline">RESULTADO DA ANÁLISE ❤️</p><p className="result-found">Garota mais bonita do mundo encontrada.</p>
    <div aria-live="polite">{step >= 1 && <h1 className="reveal-title enter">É VOCÊ. <span>❤️</span></h1>}
    {step >= 2 && <p className="result-explanation enter">Depois de analisar todas as evidências disponíveis, chegamos a uma conclusão científica extremamente séria...</p>}
    {step >= 3 && <><p className="result-final enter">Você é a garota mais bonita do mundo. ❤️</p><p className="result-footnote enter">Um resultado que a gente já sabia. Só faltava você descobrir.</p></>}</div>
    {step >= 3 && <Button variant="ghost" className="text-button replay-button enter" onClick={onReset}><RotateCcw size={15}/> Ver de novo</Button>}
    </div>
  </section>;
}
