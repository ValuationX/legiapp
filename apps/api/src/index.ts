import { buildServer } from './server.js';

const app = buildServer();
const port = Number(process.env.API_PORT ?? 4000);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
