import { Router } from "express";
import { ClientController } from "../controllers/clientController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

// GET  /clients
router.get("/", ClientController.list);

// GET  /clients/:id
router.get("/:id", ClientController.get);

// POST /clients
router.post("/", ClientController.create);

// PUT  /clients/:id
router.put("/:id", ClientController.update);

// DELETE /clients/:id
router.delete("/:id", ClientController.delete);

// GET  /clients/:id/devices
router.get("/:id/devices", ClientController.getDevices);

// POST /clients/:id/addresses
router.post("/:id/addresses", ClientController.addAddress);

export default router;
