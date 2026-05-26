import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import serviceOrderRoutes from "./routes/serviceOrderRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import technicianRoutes from "./routes/technicianRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express(); // 👈 primeiro cria o app

app.use(cors()); // 👈 depois usa middleware
app.use(express.json());

// Rotas
app.use("/auth", authRoutes);
app.use("/clients", clientRoutes);
app.use("/devices", deviceRoutes);
app.use("/orders", serviceOrderRoutes);
app.use("/stock", stockRoutes);
app.use("/technicians", technicianRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/payments", paymentRoutes);
app.use("/users", userRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Rota '${req.method} ${req.path}' não encontrada.` });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV || "development"}]`);
});