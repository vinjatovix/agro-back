import {
  MailDeliveryException,
  type EmailMessage,
  type MailDeliveryReason,
  type Mailer,
  type MailReceipt
} from '../../application/mailer/index.js';
import type { AppLogger } from '../../plugins/index.js';
import { isResendSuccess, readResendErrorName } from './resendResponse.js';
import { formatSender, type SenderIdentity } from './SenderIdentity.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

interface ResendMailerDeps {
  apiKey: string;
  sender: SenderIdentity;
  timeoutMs: number;
  appVersion: string;
  logger: AppLogger;
  fetch?: typeof fetch;
}

interface ResendRequestBody {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

/** Maps a non-2xx provider status to a delivery failure reason. */
function reasonForStatus(status: number): MailDeliveryReason {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rateLimited';
  if (status >= 400 && status < 500) return 'rejected';
  return 'unavailable';
}

const isTimeout = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'TimeoutError' || error.name === 'AbortError');

const parseBody = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/** Real delivery through Resend's HTTPS sending API, bounded by a time-out. */
export class ResendMailer implements Mailer {
  private readonly apiKey: string;
  private readonly sender: SenderIdentity;
  private readonly timeoutMs: number;
  private readonly appVersion: string;
  private readonly logger: AppLogger;
  private readonly fetchFn: typeof fetch;

  constructor({
    apiKey,
    sender,
    timeoutMs,
    appVersion,
    logger,
    fetch = globalThis.fetch
  }: ResendMailerDeps) {
    this.apiKey = apiKey;
    this.sender = sender;
    this.timeoutMs = timeoutMs;
    this.appVersion = appVersion;
    this.logger = logger;
    this.fetchFn = fetch;
  }

  async send(message: EmailMessage): Promise<MailReceipt> {
    const domain = message.recipientDomain();
    let response: Response;

    try {
      response = await this.fetchFn(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': `agro-back/${this.appVersion}`
        },
        body: JSON.stringify(this.buildBody(message)),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      throw this.fail(domain, isTimeout(error) ? 'timeout' : 'unavailable');
    }

    // The status already tells the outcome; an unreadable body only loses the id.
    const { status } = response;
    const body = parseBody(await response.text().catch(() => ''));

    if (status < 200 || status >= 300) {
      const detail = readResendErrorName(body) ?? 'unknown';
      throw this.fail(domain, reasonForStatus(status), `${status}/${detail}`);
    }

    if (!isResendSuccess(body)) {
      this.logger.info(`Email sent to ${domain} (no id)`);
      return {};
    }

    this.logger.info(`Email sent to ${domain} (id ${body.id})`);
    return { messageId: body.id };
  }

  private buildBody(message: EmailMessage): ResendRequestBody {
    const body: ResendRequestBody = {
      from: formatSender(this.sender),
      to: [message.to.value],
      subject: message.subject,
      text: message.text
    };

    if (message.html !== undefined) {
      body.html = message.html;
    }

    return body;
  }

  private fail(
    recipientDomain: string,
    reason: MailDeliveryReason,
    detail = 'no response'
  ): MailDeliveryException {
    this.logger.error(
      `Email to ${recipientDomain} failed: ${reason} (${detail})`
    );
    return new MailDeliveryException({ reason, recipientDomain });
  }
}
