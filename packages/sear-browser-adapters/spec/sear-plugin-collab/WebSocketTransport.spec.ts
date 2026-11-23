import { WebSocketTransport } from '../../src/sear-plugin-collab/WebSocketTransport';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  onopen: any;
  onerror: any;
  onmessage: any;
  readyState: number = 1;
  url: string;
  sent: any[] = [];
  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
  close() {
    this.readyState = 3;
  }
  send(data: any) {
    this.sent.push(data);
  }
}

describe('WebSocketTransport', () => {
  let OriginalWebSocket: any;
  beforeAll(() => {
    OriginalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = MockWebSocket;
  });
  afterAll(() => {
    (global as any).WebSocket = OriginalWebSocket;
  });
  beforeEach(() => {
    MockWebSocket.instances = [];
  });

  it('connects and resolves', async () => {
    const transport = new WebSocketTransport();
    const promise = transport.connect({ url: 'ws://test', resourceId: 'doc1', revision: 3 });
    expect(MockWebSocket.instances[0].url).toContain('resourceId=doc1&revision=3&protocolVersion=1');
    MockWebSocket.instances[0].onopen();
    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects on error', async () => {
    const transport = new WebSocketTransport();
    const promise = transport.connect({ url: 'ws://test', resourceId: 'doc1', revision: 0 });
    MockWebSocket.instances[0].onerror();
    await expect(promise).rejects.toThrow();
  });

  it('receives messages', async () => {
    const transport = new WebSocketTransport();
    transport.connect({ url: 'ws://test?token=x', resourceId: 'doc1', revision: 0 });
    const handler = jest.fn();
    const dispose = transport.subscribe(handler);

    // valid message
    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ type: 'test' }) });
    expect(handler).toHaveBeenCalledWith({ type: 'test' });

    // invalid JSON
    MockWebSocket.instances[0].onmessage({ data: 'invalid' });
    expect(handler).toHaveBeenCalledTimes(1); // not called again
    dispose();
    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ kind: 'accepted' }) });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores messages if no handler', async () => {
    const transport = new WebSocketTransport();
    transport.connect({ url: 'ws://test', resourceId: 'doc1', revision: 0 });
    MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ type: 'test' }) });
    // should not throw
  });

  it('sends messages if open', async () => {
    const transport = new WebSocketTransport();
    transport.connect({ url: 'ws://test', resourceId: 'doc1', revision: 0 });
    transport.send({ type: 'test' } as any);
    expect(MockWebSocket.instances[0].sent).toEqual([JSON.stringify({ type: 'test' })]);
  });

  it('does not send if not open', async () => {
    const transport = new WebSocketTransport();
    transport.send({ type: 'test' } as any); // no ws

    transport.connect({ url: 'ws://test', resourceId: 'doc1', revision: 0 });
    MockWebSocket.instances[0].readyState = 0; // connecting
    transport.send({ type: 'test' } as any);
    expect(MockWebSocket.instances[0].sent).toEqual([]);
  });

  it('disconnects', async () => {
    const transport = new WebSocketTransport();
    transport.connect({ url: 'ws://test', resourceId: 'doc1', revision: 0 });
    transport.disconnect();
    expect(MockWebSocket.instances[0].readyState).toBe(3);
  });

  it('disconnects without connect', async () => {
    const transport = new WebSocketTransport();
    transport.disconnect(); // should not throw
  });
});
