'use client';
import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { Stage } from '@/lib/beauty/experience';
type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };
type ContextDocument = Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } };
export function useExperienceTools(flow: { stage: Stage; offline: boolean; progress: number; openPermission: () => void; startOffline: () => void }) {
  const current = useRef(flow); current.current = flow;
  useEffect(() => {
    const context = (document as ContextDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [{
      name: 'start_analysis',
      description: 'Start this experience. ask_for_camera opens the visible explanation; only the visitor can authorize the camera. without_camera starts the same camera-free experience offered by the interface.',
      inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['ask_for_camera', 'without_camera'] } }, required: ['mode'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).length !== 1 || !('mode' in input) || !['ask_for_camera','without_camera'].includes(String(input.mode))) throw new Error('Choose a valid mode.');
        if (!['welcome','permission','fallback'].includes(current.current.stage)) throw new Error('An experience is already running.');
        const offline = input.mode === 'without_camera';
        flushSync(() => offline ? current.current.startOffline() : current.current.openPermission());
        return { stage: current.current.stage, cameraActive: false };
      },
    }, {
      name: 'get_analysis_status', description: 'Read the current experience stage and progress. Does not access images or reveal the surprise in advance.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('This tool takes an empty object.');
        return { stage: current.current.stage, progress: Math.floor(current.current.progress), withoutCamera: current.current.offline };
      },
    }];
    for (const tool of tools) {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser integration never blocks the experience. */ }
    }
    return () => lifecycle.abort();
  }, []);
}
