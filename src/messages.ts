import * as R from 'runtypes';

const HostMessageIdentity = R.Record({
  type: R.Literal('identity'),
  data: R.Record({
    id: R.Number,
  }),
});
export type HostMessageIdentity = R.Static<typeof HostMessageIdentity>;

const HostMessagePing = R.Record({
  type: R.Literal('ping'),
});
export type HostMessagePing = R.Static<typeof HostMessagePing>;

const HostMessageSnapshot = R.Record({
  type: R.Literal('snapshot'),
  data: R.String, // TODO
});
export type HostMessageSnapshot = R.Static<typeof HostMessageSnapshot>;

// ---

const ClientMessagePong = R.Record({
  type: R.Literal('pong'),
});
export type ClientMessagePong = R.Static<typeof ClientMessagePong>;

const ClientMessageKeyUp = R.Record({
  type: R.Literal('keyUp'),
  data: R.Record({
    keyCode: R.Number,
  }),
});
export type ClientMessageKeyUp = R.Static<typeof ClientMessageKeyUp>;

const ClientMessageKeyDown = R.Record({
  type: R.Literal('keyDown'),
  data: R.Record({
    keyCode: R.Number,
  }),
});
export type ClientMessageKeyDown = R.Static<typeof ClientMessageKeyDown>;

// ---

const HostMessage = R.Union(
  HostMessageIdentity,
  HostMessagePing,
  HostMessageSnapshot
);
export type HostMessage = R.Static<typeof HostMessage>;

const ClientMessage = R.Union(
  ClientMessagePong,
  ClientMessageKeyUp,
  ClientMessageKeyDown
);
export type ClientMessage = R.Static<typeof ClientMessage>;

// ---

export function serializeMessage(sender: 'client', msg: ClientMessage): string;
export function serializeMessage(sender: 'host', msg: HostMessage): string;
export function serializeMessage(
  sender: 'client' | 'host',
  msg: ClientMessage | HostMessage
): string {
  return JSON.stringify(msg);
}

export function deserializeMessage(
  sender: 'client',
  msgStr: string
): ClientMessage;
export function deserializeMessage(sender: 'host', msgStr: string): HostMessage;
export function deserializeMessage(
  sender: 'client' | 'host',
  msgStr: string
): ClientMessage | HostMessage {
  const msg = JSON.parse(msgStr);
  if (sender === 'client') {
    return ClientMessage.check(msg);
  }
  return HostMessage.check(msg);
}
