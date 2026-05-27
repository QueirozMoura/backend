import { Router } from "express";
import { UserModel } from "../models/userModel.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { createError } from "../middlewares/errorHandler.js";

const router = Router();

// Todas as rotas de /users exigem autenticação de admin
router.use(authenticate, authorize("admin"));

// GET /users — lista usuários (sem password_hash)
router.get("/", async (req, res, next) => {
  try {
    const { role, search, limit = 50, offset = 0 } = req.query;
    const users = await UserModel.findAll({ role, search, limit: Number(limit), offset: Number(offset) });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /users/:id
router.get("/:id", async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) throw createError(404, "Usuário não encontrado.");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /users/:id
router.put("/:id", async (req, res, next) => {
  try {
    const { name, phone, avatar_url, is_active } = req.body;
    const user = await UserModel.update(req.params.id, { name, phone, avatar_url, is_active });
    if (!user) throw createError(404, "Usuário não encontrado.");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /users/:id — soft delete
router.delete("/:id", async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      throw createError(400, "Não é possível excluir o próprio usuário.");
    }
    const deleted = await UserModel.softDelete(req.params.id);
    if (!deleted) throw createError(404, "Usuário não encontrado.");
    res.json({ message: "Usuário removido com sucesso." });
  } catch (err) {
    next(err);
  }
});

export default router;
