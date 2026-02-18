const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// WebSocket server for chat + real-time updates
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

function setupWebSocket() {
  wss.on('connection', async (ws) => {
    clients.add(ws);

    // Send chat history
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const messages = await prisma.chatMessage.findMany({
        where: { deleted: false },
        orderBy: { createdAt: 'asc' },
        take: 100,
        include: { user: { select: { name: true } } },
      });

      ws.send(JSON.stringify({
        type: 'chat:history',
        messages: messages.map((m) => {
          const fullName = m.user?.name || m.guestName || 'Anonymous';
          const firstName = fullName.split(' ')[0];
          return {
            id: m.id,
            userName: firstName,
            message: m.message,
            createdAt: m.createdAt.toISOString(),
          };
        }),
      }));

      await prisma.$disconnect();
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }

    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        if (parsed.type === 'chat:message' && parsed.message) {
          // Filter blacklisted words
          const blacklist = await prisma.chatBlacklist.findMany();
          let filtered = parsed.message;
          for (const { word } of blacklist) {
            const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            filtered = filtered.replace(regex, '***');
          }

          // Determine user from userId
          let userName = 'Anonymous';
          let userId = parsed.userId || null;

          if (userId) {
            try {
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true },
              });
              if (user) {
                userName = user.name.split(' ')[0];
              } else {
                userId = null;
              }
            } catch {
              userId = null;
            }
          }

          const msg = await prisma.chatMessage.create({
            data: {
              message: filtered.slice(0, 500),
              userId,
              guestName: userId ? null : userName,
            },
          });

          const broadcast = JSON.stringify({
            type: 'chat:message',
            message: {
              id: msg.id,
              userName,
              message: msg.message,
              createdAt: msg.createdAt.toISOString(),
            },
          });

          for (const client of clients) {
            if (client.readyState === 1) {
              client.send(broadcast);
            }
          }
        } else if (parsed.type === 'squares:changed') {
          // Broadcast squares refresh notification to all clients
          const broadcast = JSON.stringify({ type: 'squares:refresh' });
          for (const client of clients) {
            if (client.readyState === 1) {
              client.send(broadcast);
            }
          }
          await prisma.$disconnect();
          return;
        } else if (parsed.type === 'chat:delete' && parsed.messageId) {
          if (parsed.userId) {
            try {
              const user = await prisma.user.findUnique({
                where: { id: parsed.userId },
                select: { role: true },
              });
              if (user && (user.role === 'ADMIN' || user.role === 'VIEWER')) {
                await prisma.chatMessage.update({
                  where: { id: parsed.messageId },
                  data: { deleted: true },
                });

                const broadcast = JSON.stringify({
                  type: 'chat:delete',
                  messageId: parsed.messageId,
                });

                for (const client of clients) {
                  if (client.readyState === 1) {
                    client.send(broadcast);
                  }
                }
              }
            } catch {
              // ignore
            }
          }
        }

        await prisma.$disconnect();
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });
}

// Payment reminder scheduler - check every 15 minutes
function startPaymentReminders() {
  setInterval(async () => {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const nodemailer = require('nodemailer');

      const settings = await prisma.gameSettings.findUnique({
        where: { id: 'singleton' },
        include: { paymentMethods: true },
      });

      if (!settings || !settings.graceHours) {
        await prisma.$disconnect();
        return;
      }

      const template = await prisma.emailTemplate.findUnique({
        where: { name: 'payment_reminder' },
      });

      if (!template) {
        await prisma.$disconnect();
        return;
      }

      const emailSettings = await prisma.emailSettings.findUnique({
        where: { id: 'singleton' },
      });

      if (!emailSettings || !emailSettings.smtpHost) {
        await prisma.$disconnect();
        return;
      }

      const transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort,
        secure: emailSettings.smtpPort === 465,
        auth: { user: emailSettings.smtpUser, pass: emailSettings.smtpPass },
      });

      const gameUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const enabledPayments = settings.paymentMethods?.filter((pm) => pm.enabled) || [];
      const paymentMethodsText = enabledPayments.length > 0
        ? enabledPayments.map((pm) => `${pm.type}: ${pm.value}`).join('\n')
        : 'Contact the commissioner for payment details.';

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

          const variables = {
            name,
            email,
            squares: sq.position,
            amountDue: settings.betAmount.toFixed(2),
            commissioner: settings.commissioner || '',
            eventName: settings.eventName || '',
            gameUrl,
            graceHours: String(settings.graceHours),
            paymentInstructions: settings.paymentInstructions || '',
            paymentMethods: paymentMethodsText,
          };

          let subject = template.subject;
          let body = template.body;
          for (const [key, val] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            subject = subject.replace(regex, val);
            body = body.replace(regex, val);
          }

          try {
            await transporter.sendMail({
              from: `"${emailSettings.fromName || 'Super Bowl Squares'}" <${emailSettings.fromEmail || 'noreply@localhost'}>`,
              to: email,
              subject,
              text: body,
            });
            await prisma.square.update({
              where: { id: sq.id },
              data: { reminderSent: true },
            });
            console.log(`[Reminder] Payment reminder sent to ${email} for square ${sq.position}`);
          } catch (err) {
            console.error(`[Reminder] Failed to send to ${email}:`, err.message || err);
          }
        }
      }

      await prisma.$disconnect();
    } catch (err) {
      console.error('[Reminder] Scheduler error:', err.message || err);
    }
  }, 15 * 60 * 1000);
}

// --- Boot ---

if (dev) {
  // Development mode: use standard next() API
  const next = require('next');
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    server.on('upgrade', (req, socket, head) => {
      const { pathname } = parse(req.url, true);
      if (pathname === '/ws/chat') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    setupWebSocket();
    startPaymentReminders();

    server.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  });
} else {
  // Production standalone mode: use startServer but monkey-patch http.createServer
  // to capture the server instance for WebSocket upgrade handling
  const dir = path.join(__dirname);
  process.chdir(__dirname);

  // Read the standalone config: either from env (if already set) or from the
  // saved original standalone server.js which contains the embedded nextConfig
  if (!process.env.__NEXT_PRIVATE_STANDALONE_CONFIG) {
    try {
      const fs = require('fs');
      const standaloneCode = fs.readFileSync(path.join(__dirname, 'server.standalone.js'), 'utf8');
      const match = standaloneCode.match(/const nextConfig = (\{[\s\S]*?\})\n\nprocess\.env\.__NEXT_PRIVATE_STANDALONE_CONFIG/);
      if (match) {
        process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = match[1];
      }
    } catch (err) {
      console.warn('Could not read standalone config:', err.message);
    }
  }
  const nextConfig = process.env.__NEXT_PRIVATE_STANDALONE_CONFIG
    ? JSON.parse(process.env.__NEXT_PRIVATE_STANDALONE_CONFIG)
    : undefined;

  // Monkey-patch http.createServer to intercept the server Next.js creates
  const http = require('http');
  const originalCreateServer = http.createServer.bind(http);

  http.createServer = function patchedCreateServer(...args) {
    const server = originalCreateServer(...args);

    // Prepend our upgrade listener BEFORE Next.js adds its own
    const originalOn = server.on.bind(server);
    server.on = function patchedOn(event, listener) {
      if (event === 'upgrade') {
        // Wrap Next.js upgrade handler to intercept /ws/chat
        originalOn('upgrade', (req, socket, head) => {
          const { pathname } = parse(req.url, true);
          if (pathname === '/ws/chat') {
            wss.handleUpgrade(req, socket, head, (ws) => {
              wss.emit('connection', ws, req);
            });
          } else {
            listener(req, socket, head);
          }
        });
        // Restore original .on so future calls work normally
        server.on = originalOn;
        return server;
      }
      return originalOn(event, listener);
    };

    // Restore http.createServer
    http.createServer = originalCreateServer;

    return server;
  };

  setupWebSocket();
  startPaymentReminders();

  // Now let Next.js startServer do its thing - it will use our patched createServer
  require('next');
  const { startServer } = require('next/dist/server/lib/start-server');

  let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10);
  if (Number.isNaN(keepAliveTimeout) || !Number.isFinite(keepAliveTimeout) || keepAliveTimeout < 0) {
    keepAliveTimeout = undefined;
  }

  startServer({
    dir,
    isDev: false,
    config: nextConfig,
    hostname,
    port,
    allowRetry: false,
    keepAliveTimeout,
  }).then(() => {
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/ws/chat`);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
