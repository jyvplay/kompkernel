/**
 * src/lib/api-mock.ts
 * =============================================================================
 * FRONTEND <-> BACKEND API CONNECTOR
 * Ensures full connection between client UI and backend API routes
 * (/api/conversions, /api/codec-audit, /api/health) in client-side Vite SPA.
 * =============================================================================
 */

import { omegaXiCompress, omegaXiDecode } from './omega/atom-codec';
import { runCodecAudit } from './omega/registry';

interface HistoryRow {
  id: number;
  source: string;
  output: string;
  preset: string;
  charDeltaPct: number;
  createdAt: string;
}

const STORAGE_KEY = 'veritas_conversions_history';

function getStoredHistory(): HistoryRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryRow[];
  } catch {
    return [];
  }
}

function saveStoredHistory(rows: HistoryRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota exceeded or private mode */
  }
}

let installed = false;

export function installApiMock(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const origFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();

    // 1. /api/health
    if (urlStr.includes('/api/health')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. /api/conversions
    if (urlStr.includes('/api/conversions')) {
      if (method === 'GET') {
        const rows = getStoredHistory();
        return new Response(JSON.stringify({ ok: true, rows }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (method === 'POST') {
        try {
          const bodyText = init?.body
            ? typeof init.body === 'string'
              ? init.body
              : await new Response(init.body).text()
            : '{}';
          const body = JSON.parse(bodyText) as {
            source?: string;
            output?: string;
            preset?: string;
            inChars?: number;
            outChars?: number;
            charDeltaPct?: number;
          };
          if (!body.source || !body.output) {
            return new Response(JSON.stringify({ ok: false, error: 'source and output required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          const rows = getStoredHistory();
          const newRow: HistoryRow = {
            id: Date.now(),
            source: body.source.slice(0, 20000),
            output: body.output.slice(0, 20000),
            preset: body.preset ?? 'balanced',
            charDeltaPct: body.charDeltaPct ?? 0,
            createdAt: new Date().toISOString(),
          };
          const updated = [newRow, ...rows].slice(0, 20);
          saveStoredHistory(updated);
          return new Response(JSON.stringify({ ok: true, row: newRow }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false, error: 'save failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 3. /api/codec-audit
    if (urlStr.includes('/api/codec-audit')) {
      if (method === 'POST') {
        try {
          const bodyText = init?.body
            ? typeof init.body === 'string'
              ? init.body
              : await new Response(init.body).text()
            : '{}';
          const body = JSON.parse(bodyText) as {
            text?: string;
            codec?: string;
            operation?: string;
          };
          const text = body.text ?? '';
          if (body.codec === 'omegaXi' || !body.codec) {
            if (body.operation === 'decode') {
              const decoded = await omegaXiDecode(text, 'o200k_base');
              return new Response(JSON.stringify({ ok: true, output: decoded }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            }
            const comp = await omegaXiCompress(text, 'o200k_base');
            const verified = await omegaXiDecode(comp.output, 'o200k_base');
            return new Response(
              JSON.stringify({
                ok: comp.ok && verified === text,
                output: comp.output,
                codec: comp.codecName,
                candidates: comp.candidates,
                inTokens: comp.inTokens,
                outTokens: comp.outTokens,
                savingsPct: comp.savingsPct,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
          // Audit run across registry
          const results = await runCodecAudit(text, 'o200k_base', false);
          return new Response(JSON.stringify({ ok: true, results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    return origFetch(input, init);
  };
}
