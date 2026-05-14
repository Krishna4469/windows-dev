import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import whatsappRouter from "./routes/whatsapp.js";
import crewsRouter from "./routes/crews.js";
import eventsRouter from "./routes/events.js";
import gamesRouter from "./routes/games.js";
import leaderboardRouter from "./routes/leaderboard.js";
import membersRouter from "./routes/members.js";
import tournamentsRouter from "./routes/tournaments.js";
import floorsRouter from "./routes/floors.js";
import classesRouter from "./routes/classes.js";
import wellnessRouter from "./routes/wellness.js";
import proshopRouter from "./routes/proshop.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

// Raw body for HMAC verification on the webhook — must precede express.json()
app.use('/api/whatsapp/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use('/api/whatsapp', whatsappRouter);
app.use('/api/crews', crewsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/members', membersRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/floors', floorsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/wellness', wellnessRouter);
app.use('/api/proshop', proshopRouter);

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("client disconnected:", socket.id);
  });
});

const PORT = process.env["PORT"] ?? 3002;

httpServer.listen(PORT, () => {
  console.log(`off-court server running on http://localhost:${PORT}`);
});
