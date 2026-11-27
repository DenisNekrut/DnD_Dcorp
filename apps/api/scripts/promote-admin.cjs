const { PrismaClient } = require('@prisma/client');

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run admin:promote -- user@example.com');
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({ where: { email }, data: { platformRole: 'ADMIN' }, select: { id: true, email: true, username: true, platformRole: true } });
    console.log('Portal administrator enabled:', user);
  } catch (error) {
    console.error('Could not promote account. Make sure the user is registered and DATABASE_URL is configured.', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
main();
