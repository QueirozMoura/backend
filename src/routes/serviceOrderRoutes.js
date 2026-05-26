import { Router } from "express";
import { ServiceOrderController } from "../controllers/serviceOrderController.js";
import { PaymentController } from "../controllers/paymentController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

// GET  /orders
router.get("/", ServiceOrderController.list);

// GET  /orders/:id
router.get("/:id", ServiceOrderController.get);

// POST /orders
router.post("/", ServiceOrderController.create);

// PUT  /orders/:id
router.put("/:id", ServiceOrderController.update);

// PATCH /orders/:id/status
router.patch("/:id/status", ServiceOrderController.changeStatus);

// DELETE /orders/:id  — admin only
router.delete("/:id", authorize("admin"), ServiceOrderController.delete);

// POST /orders/:id/parts
router.post("/:id/parts", ServiceOrderController.addPart);

// DELETE /orders/:id/parts/:partEntryId
router.delete("/:id/parts/:partEntryId", ServiceOrderController.removePart);

// GET  /orders/:orderId/payments
router.get("/:orderId/payments", PaymentController.listByOrder);

// POST /orders/:orderId/payments
router.post("/:orderId/payments", PaymentController.register);

export default router;
