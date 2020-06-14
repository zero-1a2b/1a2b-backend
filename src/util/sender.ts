export enum SenderType {
  PLAYER,
  ADMIN,
  INTERNAL
}

export type PlayerSender = { type: SenderType.PLAYER; player: string; };

export type InternalSender = { type: SenderType.INTERNAL };

export const INTERNAL_SENDER: InternalSender = { type: SenderType.INTERNAL };

export type RequestSender = PlayerSender | InternalSender;


export function isInternalSender(sender: RequestSender): sender is InternalSender {
  return sender.type === INTERNAL_SENDER.type;
}

export function isPlayerSender(sender: RequestSender): sender is PlayerSender {
  return sender.type === SenderType.PLAYER;
}


export function assertTrue(expr: boolean): void {
  if (!expr) {
    throw new Error('error.not_permitted');
  }
}

export function assertSenderType(sender: RequestSender, type: SenderType): void {
  assertTrue(sender.type === type);
}

export function assertInternalSender(sender: RequestSender): void {
  assertSenderType(sender, SenderType.INTERNAL);
}
