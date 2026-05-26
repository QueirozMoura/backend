import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

// POST /auth/login
router.post("/login", AuthController.login);

// POST /auth/refresh
router.post("/refresh", AuthController.refresh);

// POST /auth/logout
router.post("/logout", AuthController.logout);

// GET /auth/me  — requer autenticação
router.get("/me", authenticate, AuthController.me);

// POST /auth/users  — apenas admin cria novos usuários
router.post("/users", authenticate, authorize("admin"), AuthController.createUser);

export default router;
