import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed 100 squares (positions "00" through "99")
  const squares = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const position = `${row}${col}`;
      squares.push({ position });
    }
  }

  for (const square of squares) {
    await prisma.square.upsert({
      where: { position: square.position },
      update: {},
      create: square,
    });
  }

  // Seed default game settings
  await prisma.gameSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      title: 'Super Bowl Squares',
      commissioner: 'Commissioner',
      eventName: 'Super Bowl',
      betAmount: 10,
      winFirstPct: 20,
      winSecondPct: 20,
      winThirdPct: 20,
      winFinalPct: 30,
      donationPct: 10,
      graceHours: 48,
    },
  });

  // Seed default score row
  await prisma.score.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });

  // Seed default email settings
  await prisma.emailSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });

  // Seed default email templates
  const templates = [
    {
      name: 'welcome',
      subject: 'Welcome to {{eventName}}!',
      body: 'Hi {{name}},\n\nWelcome to {{eventName}} Squares!\n\nYour account has been created successfully.\n\nUsername: {{email}}\n\nYou can log in and view the game board at:\n{{gameUrl}}/login\n\nThanks for joining!\n{{commissioner}}',
    },
    {
      name: 'square_confirmation',
      subject: 'Square Purchase Confirmation - {{eventName}}',
      body: 'Hi {{name}},\n\nThank you for purchasing squares for {{eventName}}!\n\nSquare(s): {{squares}}\nAmount Due: ${{amountDue}}\n\nPlease submit payment within {{graceHours}} hours to keep your squares.\n\nPayment Instructions:\n{{paymentInstructions}}\n\nPayment Methods:\n{{paymentMethods}}\n\nView your squares at: {{gameUrl}}\n\nThanks,\n{{commissioner}}',
    },
    {
      name: 'square_confirmed',
      subject: 'Payment Confirmed - {{eventName}}',
      body: 'Hi {{name}},\n\nGreat news! Your payment has been confirmed for {{eventName}}.\n\nSquare(s): {{squares}}\n\nYour squares are now locked in. View the game board at:\n{{gameUrl}}\n\nGood luck!\n{{commissioner}}',
    },
    {
      name: 'square_released',
      subject: 'Square Released - {{eventName}}',
      body: 'Hi {{name}},\n\nYour square(s) for {{eventName}} have been released.\n\nSquare(s): {{squares}}\n\nIf you believe this is an error, please contact the commissioner.\n\nView the game board at: {{gameUrl}}\n\n{{commissioner}}',
    },
    {
      name: 'payment_reminder',
      subject: 'Payment Reminder - {{eventName}}',
      body: 'Hi {{name}},\n\nThis is a friendly reminder that your payment for {{eventName}} is due soon!\n\nSquare(s): {{squares}}\nAmount Due: ${{amountDue}}\n\nYour grace period expires in approximately 2 hours. After that, your squares may be released.\n\nPayment Instructions:\n{{paymentInstructions}}\n\nPayment Methods:\n{{paymentMethods}}\n\nView your squares at: {{gameUrl}}\n\nThanks,\n{{commissioner}}',
    },
    {
      name: 'winner_notification',
      subject: 'Congratulations! You won {{quarter}} - {{eventName}}',
      body: 'Hi {{name}},\n\nCongratulations! You are the winner of the {{quarter}} quarter!\n\nSquare: {{square}}\nScore: {{nfcTeam}} {{nfcScore}} - {{afcTeam}} {{afcScore}}\nPrize: ${{prize}}\n\nThanks,\n{{commissioner}}',
    },
    {
      name: 'numbers_assigned',
      subject: 'Numbers Have Been Assigned - {{eventName}}',
      body: 'Hi {{name}},\n\nThe random numbers have been assigned for {{eventName}}!\n\nVisit the game board to see your numbers and check your squares:\n{{gameUrl}}\n\nGood luck!\n{{commissioner}}',
    },
    {
      name: 'game_results',
      subject: 'Final Results - {{eventName}}',
      body: 'Hi {{name}},\n\nThe game is over! Here are the final results for {{eventName}}:\n\nWinners:\n{{winners}}\n\nCongratulations to all the winners!\n\nThank you for participating in this year\'s Super Bowl Squares. We hope you had a great time!\n\nView the final board at: {{gameUrl}}\n\n{{commissioner}}',
    },
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {},
      create: template,
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
