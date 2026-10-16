import { MailDeliveryException } from '../../../../../src/Contexts/shared/application/mailer/index.js';
import { InProcessBackgroundTasks } from '../../../../../src/Contexts/shared/infrastructure/background/index.js';
import {
  type FakeLogger,
  fakeLogger,
  firstMessage,
  loggedMessages
} from '../mailer/fakeLogger.js';

const LABEL = 'Account email activation to example.com';

/** A task whose promise the test settles by hand. */
const deferredTask = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { task: jest.fn(() => promise), resolve };
};

describe('InProcessBackgroundTasks', () => {
  let logger: FakeLogger;
  let tasks: InProcessBackgroundTasks;

  beforeEach(() => {
    logger = fakeLogger();
    tasks = new InProcessBackgroundTasks({ logger });
  });

  it('should return before the task settles', async () => {
    const { task, resolve } = deferredTask();
    let settled = false;

    tasks.run(LABEL, task);
    const idle = tasks.idle().then(() => {
      settled = true;
    });

    expect(task).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    resolve();
    await idle;
    expect(settled).toBe(true);
  });

  it('should be idle at once when nothing was started', async () => {
    await expect(tasks.idle()).resolves.toBeUndefined();
  });

  it('should also wait for tasks started while waiting', async () => {
    const second = deferredTask();
    const first = deferredTask();
    let settled = false;
    tasks.run(LABEL, first.task);
    const idle = tasks.idle().then(() => {
      settled = true;
    });

    tasks.run(LABEL, second.task);
    first.resolve();
    await new Promise((done) => setImmediate(done));
    expect(settled).toBe(false);

    second.resolve();
    await idle;
    expect(settled).toBe(true);
  });

  it('should log a delivery failure once, with the label and reason only', async () => {
    tasks.run(LABEL, () =>
      Promise.reject(
        new MailDeliveryException({
          reason: 'timeout',
          recipientDomain: 'example.com'
        })
      )
    );

    await tasks.idle();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(firstMessage(logger.warn)).toBe(`${LABEL} failed: timeout`);
    expect(logger.warn.mock.calls[0]).toHaveLength(1);
  });

  it('should log the class name of any other error', async () => {
    tasks.run(LABEL, () => Promise.reject(new TypeError('secret detail')));

    await tasks.idle();

    expect(firstMessage(logger.warn)).toBe(`${LABEL} failed: TypeError`);
  });

  it('should catch a synchronous throw from the task', async () => {
    expect(() =>
      tasks.run(LABEL, () => {
        throw new RangeError('boom');
      })
    ).not.toThrow();

    await tasks.idle();

    expect(firstMessage(logger.warn)).toBe(`${LABEL} failed: RangeError`);
  });

  it('should never log what the task carried', async () => {
    const payload = 'token=abc123 ana@example.com';
    tasks.run(LABEL, () => Promise.reject(new Error(payload)));

    await tasks.idle();

    expect(loggedMessages(logger).join(' ')).not.toContain(payload);
  });
});
