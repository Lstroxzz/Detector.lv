# Um instante

Experiência de câmera no navegador com uma entrada mínima: apenas **Começar**. O acesso à câmera é solicitado na tela seguinte. O resultado é uma surpresa, revelada gradualmente.

## Executar

Requisitos: Node.js 22.13 ou posterior e pnpm.

```sh
pnpm install
pnpm dev
pnpm exec tsc --noEmit
node --experimental-strip-types --test tests/experience.test.ts
pnpm build
```

Abra o endereço indicado pelo servidor. Em celulares a câmera requer HTTPS. Use Safari ou Chrome atualizados; se a câmera ou o detector não estiver disponível, há uma experiência sem câmera.

## Organização

- `app/page.tsx`: telas, consentimento, scanner e estados de erro.
- `app/globals.css`: interface neutra, responsividade e movimento reduzido.
- `hooks/use-experience.ts`: estados, progresso e limpeza de recursos.
- `lib/beauty/camera.ts`: captura, timeout e mensagens de câmera.
- `lib/beauty/face-detector.ts`: MediaPipe FaceDetector em modo VIDEO, até 10 inferências/s.
- `lib/beauty/movement.ts`: coordenadas de enquadramento e deslocamento do rosto.
- `lib/beauty/experience.ts`: duração e sequência das mensagens.
- `components/beauty/result.tsx`: revelação e corações finais.
- `public/mediapipe/wasm` e `public/models`: arquivos locais da visão computacional.

Detecção de pose não é necessária: o acompanhamento usa a caixa facial e seu deslocamento, sem identificação pessoal. O resultado é uma mensagem lúdica predefinida, não uma avaliação real de aparência.

## Privacidade e recursos

Nenhuma imagem é enviada, salva, fotografada ou gravada pelo aplicativo. Não há analytics, banco de rostos, armazenamento de mídia nem backend para analisar a câmera. Modelo e WASM são servidos pelo próprio site. O vídeo é apenas uma visualização ao vivo; os quadros são processados em memória pelo MediaPipe.

Ao concluir, cancelar, ocultar a aba ou sair da página, as tracks da câmera são encerradas. Detector e loop de inferência são liberados. Recursos que terminam de carregar após cancelamento/timeout também são descartados. Sem rosto, o progresso pausa e uma alternativa aparece após 15 segundos.

## Validação

Testes automatizados cobrem progresso, coordenadas, movimento, descarte tardio de câmera/modelo e erros de câmera. A checagem TypeScript e a compilação validam a integração. Acesso físico à câmera em iPhone, Android e computadores deve ser verificado no dispositivo; os testes estruturais não substituem essa validação.

## Dependências de visão

MediaPipe Tasks Vision 0.10.32 (Apache-2.0), com BlazeFace short-range float16, versão 1. Fontes: https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js e https://github.com/google-ai-edge/mediapipe. O modelo original está em https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite.

Os arquivos WASM são cópias do pacote fixado. Ao atualizar o pacote, copie novamente `node_modules/@mediapipe/tasks-vision/wasm/*` para `public/mediapipe/wasm/` e valide em dispositivos móveis.
