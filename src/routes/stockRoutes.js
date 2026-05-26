import { Router } from "express";
import { StockController } from "../controllers/stockController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

// GET  /stock               — posição atual do estoque
router.get("/", StockController.listStock);

// GET  /stock/movements     — histórico de movimentações
router.get("/movements", StockController.listMovements);

// POST /stock/movements     — registrar entrada/ajuste manual
router.post("/movements", authorize("admin", "attendant"), StockController.registerMovement);

// GET  /stock/parts
router.get("/parts", StockController.listParts);

// GET  /stock/parts/:id
router.get("/parts/:id", StockController.getPart);

// POST /stock/parts         — admin only
router.post("/parts", authorize("admin"), StockController.createPart);

// PUT  /stock/parts/:id     — admin only
router.put("/parts/:id", authorize("admin"), StockController.updatePart);

// DELETE /stock/parts/:id   — admin only
router.delete("/parts/:id", authorize("admin"), StockController.deletePart);

export default router;
