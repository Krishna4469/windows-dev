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
import { coworkRouter, kidsRouter } from "./routes/cowork.js";
import crmRouter from "./routes/crm.js";
import cvRouter from "./routes/cv.js";
import staffTrackingRouter from "./routes/staff-tracking.js";
import staffAuthRouter from "./routes/staff-auth.js";
import financeRouter from "./routes/finance.js";
import payrollRouter from "./routes/payroll.js";
import complianceRouter from "./routes/compliance.js";
import facilityRouter from "./routes/facility.js";
import operationsRouter from "./routes/operations.js";
import environmentRouter from "./routes/environment.js";
import marketingRouter from "./routes/marketing.js";
import franchiseRouter from "./routes/franchise.js";
import authRouter from "./routes/auth.js";
import oauthRouter from "./routes/oauth.js";
import checkinRouter from "./routes/checkin.js";
import displaysRouter from "./routes/displays.js";
import ifcRouter from "./routes/ifc.js";
import spatialRouter from "./routes/spatial.js";
import venuesRouter from "./routes/venues.js";
import arRouter from "./routes/ar.js";
import healthRouter from "./routes/health.js";
import marketplaceRouter from "./routes/marketplace.js";

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
app.use('/api/cowork', coworkRouter);
app.use('/api/kids', kidsRouter);
app.use('/api/crm', crmRouter);
app.use('/api/cv', cvRouter);
app.use('/api/staff', staffTrackingRouter);
app.use('/api/staff', staffAuthRouter);
app.use('/api/finance', financeRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/facility', facilityRouter);
app.use('/api/ops', operationsRouter);
app.use('/api/environment', environmentRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/franchise', franchiseRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth', oauthRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/displays', displaysRouter);
app.use('/api/ifc', ifcRouter);
app.use('/api/spatial', spatialRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/ar', arRouter);
app.use('/api/health', healthRouter);
app.use('/api/marketplace', marketplaceRouter);

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
