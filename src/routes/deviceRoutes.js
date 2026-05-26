import { Router } from "express";
import { DeviceController } from "../controllers/deviceController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

// GET  /devices/brands
router.get("/brands", DeviceController.getBrands);

// GET  /devices?client_id=...
router.get("/", DeviceController.list);

// GET  /devices/:id
router.get("/:id", DeviceController.get);

// POST /devices
router.post("/", DeviceController.create);

// PUT  /devices/:id
router.put("/:id", DeviceController.update);

// DELETE /devices/:id
router.delete("/:id", DeviceController.delete);

export default router;
