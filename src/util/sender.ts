export enum SenderType {
  PLAYER,
  SYSTEM,
  INTERNAL
}

export type PlayerSender = { type: SenderType.PLAYER; player: string; };

export type InternalSender = { type: SenderType.INTERNAL };

export const INTERNAL_SENDER: InternalSender = { type: SenderType.INTERNAL };

export type RequestSender = PlayerSender | InternalSender;


export function assertTrue(expr: boolean): void {
  if (!expr) {
    throw new Error('error.not_permitted');
  }
}

function assertSenderType(sender: RequestSender, type: SenderType): void {
  assertTrue(sender.type === type);
}

export function assertInternalSender(sender: RequestSender): void {
  assertSenderType(sender, SenderType.INTERNAL);
}
