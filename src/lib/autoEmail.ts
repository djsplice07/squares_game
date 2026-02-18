import { prisma } from './prisma';
import { sendEmail, renderTemplate } from './email';

async function getGameContext() {
  const settings = await prisma.gameSettings.findUnique({
    where: { id: 'singleton' },
    include: { paymentMethods: true },
  }) as any;

  const gameUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const enabledPayments = settings?.paymentMethods?.filter((pm: any) => pm.enabled) || [];
  const paymentMethodsText = enabledPayments.length > 0
    ? enabledPayments.map((pm: any) => `${pm.type}: ${pm.value}`).join('\n')
    : 'Contact the commissioner for payment details.';

  return { settings, gameUrl, paymentMethodsText };
}

async function getTemplate(name: string) {
  return prisma.emailTemplate.findUnique({ where: { name } });
}

function fireAndForget(fn: () => Promise<void>) {
  fn().catch((err) => console.error('[AutoEmail]', err));
}

/**
 * Send welcome email when a user registers.
 */
export function sendWelcomeEmail(userName: string, userEmail: string) {
  fireAndForget(async () => {
    const template = await getTemplate('welcome');
    if (!template) return;

    const { settings, gameUrl } = await getGameContext();

    const variables: Record<string, string> = {
      name: userName,
      email: userEmail,
      commissioner: settings?.commissioner || '',
      eventName: settings?.eventName || '',
      gameUrl,
    };

    const subject = renderTemplate(template.subject, variables);
    const body = renderTemplate(template.body, variables);
    await sendEmail(userEmail, subject, body);
    console.log(`[AutoEmail] Welcome email sent to ${userEmail}`);
  });
}

/**
 * Send square purchase confirmation email.
 */
export function sendPurchaseConfirmationEmail(
  name: string,
  email: string,
  positions: string[]
) {
  fireAndForget(async () => {
    const template = await getTemplate('square_confirmation');
    if (!template) return;

    const { settings, gameUrl, paymentMethodsText } = await getGameContext();
    const amountDue = ((settings?.betAmount || 10) * positions.length).toFixed(2);

    const variables: Record<string, string> = {
      name,
      email,
      squares: positions.join(', '),
      amountDue,
      commissioner: settings?.commissioner || '',
      eventName: settings?.eventName || '',
      gameUrl,
      graceHours: String(settings?.graceHours || 48),
      paymentInstructions: settings?.paymentInstructions || '',
      paymentMethods: paymentMethodsText,
    };

    const subject = renderTemplate(template.subject, variables);
    const body = renderTemplate(template.body, variables);
    await sendEmail(email, subject, body);
    console.log(`[AutoEmail] Purchase confirmation sent to ${email} for squares ${positions.join(', ')}`);
  });
}

/**
 * Send email when square is confirmed by admin.
 */
export function sendSquareConfirmedEmail(position: string) {
  fireAndForget(async () => {
    const square = await prisma.square.findUnique({
      where: { position },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!square) return;

    const email = square.user?.email || square.guestEmail;
    const name = square.user?.name || square.guestName;
    if (!email || !name) return;

    const template = await getTemplate('square_confirmed');
    if (!template) return;

    const { settings, gameUrl } = await getGameContext();

    const variables: Record<string, string> = {
      name,
      email,
      squares: position,
      commissioner: settings?.commissioner || '',
      eventName: settings?.eventName || '',
      gameUrl,
    };

    const subject = renderTemplate(template.subject, variables);
    const body = renderTemplate(template.body, variables);
    await sendEmail(email, subject, body);
    console.log(`[AutoEmail] Square confirmed email sent to ${email} for square ${position}`);
  });
}

/**
 * Send email when square is released by admin.
 */
export function sendSquareReleasedEmail(
  name: string,
  email: string,
  position: string
) {
  fireAndForget(async () => {
    const template = await getTemplate('square_released');
    if (!template) return;

    const { settings, gameUrl } = await getGameContext();

    const variables: Record<string, string> = {
      name,
      email,
      squares: position,
      commissioner: settings?.commissioner || '',
      eventName: settings?.eventName || '',
      gameUrl,
    };

    const subject = renderTemplate(template.subject, variables);
    const body = renderTemplate(template.body, variables);
    await sendEmail(email, subject, body);
    console.log(`[AutoEmail] Square released email sent to ${email} for square ${position}`);
  });
}

/**
 * Send numbers assigned email to all participants.
 */
export function sendNumbersAssignedEmails() {
  fireAndForget(async () => {
    const template = await getTemplate('numbers_assigned');
    if (!template) return;

    const { settings, gameUrl } = await getGameContext();

    // Get all unique participants
    const squares = await prisma.square.findMany({
      where: {
        OR: [
          { userId: { not: null } },
          { guestEmail: { not: null } },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
    });

    const recipientMap = new Map<string, { name: string; email: string }>();
    for (const sq of squares) {
      const email = sq.user?.email || sq.guestEmail;
      const name = sq.user?.name || sq.guestName;
      if (email && name) {
        recipientMap.set(email, { name, email });
      }
    }

    let sent = 0;
    for (const recipient of Array.from(recipientMap.values())) {
      const variables: Record<string, string> = {
        name: recipient.name,
        email: recipient.email,
        commissioner: settings?.commissioner || '',
        eventName: settings?.eventName || '',
        gameUrl,
      };

      const subject = renderTemplate(template.subject, variables);
      const body = renderTemplate(template.body, variables);
      try {
        await sendEmail(recipient.email, subject, body);
        sent++;
      } catch (err) {
        console.error(`[AutoEmail] Failed to send numbers assigned to ${recipient.email}:`, err);
      }
    }
    console.log(`[AutoEmail] Numbers assigned emails sent to ${sent} participants`);
  });
}

/**
 * Send game results email when final score is entered.
 */
export function sendGameResultsEmails(winners: Record<string, { position: string; name: string }>) {
  fireAndForget(async () => {
    const template = await getTemplate('game_results');
    if (!template) return;

    const { settings, gameUrl } = await getGameContext();
    const totalPot = (settings?.betAmount || 0) * 100;

    const quarterLabels: Record<string, { label: string; pct: number }> = {
      first: { label: 'Q1', pct: settings?.winFirstPct || 20 },
      half: { label: 'Q2 (Half)', pct: settings?.winSecondPct || 20 },
      third: { label: 'Q3', pct: settings?.winThirdPct || 20 },
      final: { label: 'Final', pct: settings?.winFinalPct || 30 },
    };

    const winnerLines = Object.entries(winners).map(([key, w]) => {
      const qi = quarterLabels[key];
      const prize = (totalPot * qi.pct / 100).toFixed(2);
      return `${qi.label}: ${w.name} (Square ${w.position}) - $${prize}`;
    });

    const winnersText = winnerLines.length > 0
      ? winnerLines.join('\n')
      : 'No winners determined yet.';

    // Get all unique participants
    const squares = await prisma.square.findMany({
      where: {
        OR: [
          { userId: { not: null } },
          { guestEmail: { not: null } },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
    });

    const recipientMap = new Map<string, { name: string; email: string }>();
    for (const sq of squares) {
      const email = sq.user?.email || sq.guestEmail;
      const name = sq.user?.name || sq.guestName;
      if (email && name) {
        recipientMap.set(email, { name, email });
      }
    }

    let sent = 0;
    for (const recipient of Array.from(recipientMap.values())) {
      const variables: Record<string, string> = {
        name: recipient.name,
        email: recipient.email,
        winners: winnersText,
        commissioner: settings?.commissioner || '',
        eventName: settings?.eventName || '',
        gameUrl,
      };

      const subject = renderTemplate(template.subject, variables);
      const body = renderTemplate(template.body, variables);
      try {
        await sendEmail(recipient.email, subject, body);
        sent++;
      } catch (err) {
        console.error(`[AutoEmail] Failed to send game results to ${recipient.email}:`, err);
      }
    }
    console.log(`[AutoEmail] Game results emails sent to ${sent} participants`);
  });
}

/**
 * Check for squares approaching grace period deadline and send reminders.
 * Called periodically from server.js.
 */
export async function checkPaymentReminders() {
  try {
    const settings = await prisma.gameSettings.findUnique({
      where: { id: 'singleton' },
      include: { paymentMethods: true },
    }) as any;
    if (!settings || !settings.graceHours) return;

    const template = await getTemplate('payment_reminder');
    if (!template) return;

    const gameUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const enabledPayments = settings.paymentMethods?.filter((pm: any) => pm.enabled) || [];
    const paymentMethodsText = enabledPayments.length > 0
      ? enabledPayments.map((pm: any) => `${pm.type}: ${pm.value}`).join('\n')
      : 'Contact the commissioner for payment details.';

    // Find unconfirmed squares where reminder hasn't been sent
    // and we're within 2 hours of the grace period deadline
    const now = new Date();
    const unconfirmed = await prisma.square.findMany({
      where: {
        confirmed: false,
        reminderSent: false,
        signupDate: { not: null },
        OR: [
          { userId: { not: null } },
          { guestEmail: { not: null } },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
    });

    for (const sq of unconfirmed) {
      if (!sq.signupDate) continue;

      const deadline = new Date(sq.signupDate.getTime() + settings.graceHours * 60 * 60 * 1000);
      const reminderTime = new Date(deadline.getTime() - 2 * 60 * 60 * 1000);

      if (now >= reminderTime && now < deadline) {
        const email = sq.user?.email || sq.guestEmail;
        const name = sq.user?.name || sq.guestName;
        if (!email || !name) continue;

        const amountDue = (settings.betAmount).toFixed(2);
        const variables: Record<string, string> = {
          name,
          email,
          squares: sq.position,
          amountDue,
          commissioner: settings.commissioner || '',
          eventName: settings.eventName || '',
          gameUrl,
          graceHours: String(settings.graceHours),
          paymentInstructions: settings.paymentInstructions || '',
          paymentMethods: paymentMethodsText,
          rulesText: settings.rulesText || '',
        };

        const subject = renderTemplate(template.subject, variables);
        const body = renderTemplate(template.body, variables);

        try {
          await sendEmail(email, subject, body);
          await prisma.square.update({
            where: { id: sq.id },
            data: { reminderSent: true },
          });
          console.log(`[AutoEmail] Payment reminder sent to ${email} for square ${sq.position}`);
        } catch (err) {
          console.error(`[AutoEmail] Failed to send reminder to ${email}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('[AutoEmail] Payment reminder check error:', err);
  }
}
