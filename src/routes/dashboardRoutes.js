import { Router } from "express";
import { DashboardController } from "../controllers/dashboardController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

// GET /dashboard/summary     — resumo geral
router.get("/summary", DashboardController.summary);

// GET /dashboard/revenue     — gráfico de receita por período
router.get("/revenue", authorize("admin"), DashboardController.revenueChart);

export default router;
