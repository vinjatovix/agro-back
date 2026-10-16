export interface SenderIdentity {
  address: string;
  name?: string;
}

/** Sender shown by the local channels when `MAIL_FROM_ADDRESS` is empty. */
export const PLACEHOLDER_SENDER_ADDRESS = 'no-reply@agro.local';

/**
 * `"Name" <address>` when a display name is set, the bare address otherwise.
 * The name is always quoted (RFC 5322), so commas or brackets in it cannot
 * split or break the sender.
 */
export function formatSender(sender: SenderIdentity): string {
  if (!sender.name) return sender.address;

  const quotedName = sender.name.replaceAll(/["\\]/g, String.raw`\$&`);
  return `"${quotedName}" <${sender.address}>`;
}
