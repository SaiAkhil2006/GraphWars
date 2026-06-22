import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.ts';
import { connectDatabase } from './config/database.ts';
import { initializeFirebase } from './config/firebase.ts';
import apiRoutes from './routes/api.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { setupSocketHandlers } from './socket/handlers.ts';

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

    io.engine.on("connection_error", (err) => {
    console.log("❌ ENGINE ERROR:");
    console.log(err.code);
    console.log(err.message);
    console.log(err.context);
  });
}

main().catch(console.error);
