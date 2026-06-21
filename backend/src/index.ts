import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { initializeFirebase } from './config/firebase.js';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocketHandlers } from './socket/handlers.js';

async function main() {
  initializeFirebase();
  await connectDatabase();

  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.use('/api', apiRoutes);
  app.use(errorHandler);

  setupSocketHandlers(io);

  httpServer.listen(config.port, () => {
    console.log(`GraphWars server running on port ${config.port}`);
  });
}

main().catch(console.error);
