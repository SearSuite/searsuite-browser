import { SearError } from '@searsuite/sear-foundation-error';
import { Injectable } from '@searsuite/sear-foundation-di';
import {
  CollaborationProtocolVersion,
  type CollaborationClientMessage,
  type CollaborationServerMessage,
} from '@searsuite/sear-domain-collaboration';
import { CollabTransport } from '@searsuite/sear-plugin-collab';
import { type CollaborationTransportConnectOptions } from '@searsuite/sear-plugin-collab';

/**
 * Browser WebSocket implementation of CollabTransport.
 *
 * The authority validates and orders submitted operation batches while this
 * adapter owns only WebSocket lifecycle and JSON framing.
 */
@Injectable()
export class WebSocketTransport extends CollabTransport {
  #ws: WebSocket | null = null;
  readonly #messageHandlers = new Set<(message: CollaborationServerMessage) => void>();

  /** Opens the collaboration transport and begins receiving messages. */
  connect(options: CollaborationTransportConnectOptions): Promise<void> {
    const transport = this;
    return new Promise(function connectWebSocket(resolve, reject): void {
      const separator = options.url.includes('?') ? '&' : '?';
      const wsUrl = `${options.url}${separator}resourceId=${encodeURIComponent(options.resourceId)}&revision=${
        options.revision
      }&protocolVersion=${CollaborationProtocolVersion}`;
      transport.#ws = new WebSocket(wsUrl);

      transport.#ws.onopen = function resolveWebSocketConnection(): void {
        resolve();
      };
      transport.#ws.onerror = function rejectWebSocketConnection(): void {
        reject(new SearError(`WebSocket error: ${wsUrl}`));
      };

      transport.#ws.onmessage = function handleWebSocketMessage(event: MessageEvent): void {
        let message: CollaborationServerMessage;
        try {
          message = JSON.parse(event.data as string) as CollaborationServerMessage;
        } catch {
          return; // ignore malformed frames
        }
        transport.#messageHandlers.forEach((handler) => handler(message));
      };
    });
  }

  /** Closes the collaboration transport and releases its listeners. */
  disconnect(): void {
    this.#ws?.close();
    this.#ws = null;
  }

  /** Sends one encoded collaboration message through the transport. */
  send(message: CollaborationClientMessage): void {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;
    this.#ws.send(JSON.stringify(message));
  }

  /** Subscribes to parsed server messages. */
  subscribe(handler: (message: CollaborationServerMessage) => void): () => void {
    this.#messageHandlers.add(handler);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#messageHandlers.delete(handler);
    };
  }
}
