import type { Server } from 'node:http';

export type QaFaultProxyPath = '/finance/events' | '/finance/benefit-events';

export interface QaFaultProxyOptions {
  upstreamPort: number;
  listenPort?: number;
  dropPath: QaFaultProxyPath;
  log?: (message: string) => void;
}

export interface QaFaultProxy {
  server: Server;
  wasDropped: () => boolean;
}

export function createQaFaultProxy(options: QaFaultProxyOptions): QaFaultProxy;
