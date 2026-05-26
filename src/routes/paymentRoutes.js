import { Router } from "express";
import { PaymentController } from "../controllers/paymentController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

// GET  /payments/summary   — resumo financeiro por período
router.get("/summary", authorize("admin"), PaymentController.financialSummary);

// POST /payments           — registro de pagamento avulso (sem rota de OS)
router.post("/", PaymentController.register);

export default router;
