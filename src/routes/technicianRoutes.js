import { Router } from "express";
import { TechnicianController } from "../controllers/technicianController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

// GET  /technicians
router.get("/", TechnicianController.list);

// GET  /technicians/productivity
router.get("/productivity", authorize("admin"), TechnicianController.getProductivity);

// GET  /technicians/:id
router.get("/:id", TechnicianController.get);

// PUT  /technicians/:id  — admin only
router.put("/:id", authorize("admin"), TechnicianController.update);

export default router;
