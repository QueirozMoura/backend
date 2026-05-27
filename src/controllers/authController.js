import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserModel } from "../models/userModel.js";
import { generateTokens, verifyRefreshToken } from "../middlewares/auth.js";
import { createError } from "../middlewares/errorHandler.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

export const AuthController = {
  // Cadastro público — cria usuário com role padrão 'attendant'
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        throw createError(400, "Nome, email e senha são obrigatórios.");
      }

      if (!EMAIL_REGEX.test(email)) {
        throw createError(400, "Email inválido.");
      }

      if (password.length < 8) {
        throw createError(400, "Senha deve ter no mínimo 8 caracteres.");
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        throw createError(409, "Email já cadastrado.");
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await UserModel.create({ name, email, password_hash, role: "attendant" });

      const { accessToken, refreshToken } = generateTokens(user);
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await UserModel.saveRefreshToken(user.id, tokenHash, expiresAt);

      res.status(201).json({
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw createError(400, "Email e senha são obrigatórios.");
      }

      const user = await UserModel.findByEmail(email);

      if (!user || user.deleted_at) {
        throw createError(401, "Credenciais inválidas.");
      }

      if (!user.is_active) {
        throw createError(401, "Usuário inativo. Contate o administrador.");
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw createError(401, "Credenciais inválidas.");
      }

      const { accessToken, refreshToken } = generateTokens(user);

      // Salva o hash do refresh token no banco
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await UserModel.saveRefreshToken(user.id, tokenHash, expiresAt);
      await UserModel.updateLastLogin(user.id);

      res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw createError(400, "Refresh token não fornecido.");

      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      const stored = await UserModel.findRefreshToken(tokenHash);

      if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
        throw createError(401, "Refresh token inválido ou expirado.");
      }

      const payload = verifyRefreshToken(refreshToken);
      const user = await UserModel.findById(payload.id);
      if (!user || !user.is_active) throw createError(401, "Usuário não encontrado.");

      // Rotação de token: revoga o atual e emite um novo
      await UserModel.revokeRefreshToken(tokenHash);
      const tokens = generateTokens(user);
      const newHash = crypto.createHash("sha256").update(tokens.refreshToken).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await UserModel.saveRefreshToken(user.id, newHash, expiresAt);

      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        await UserModel.revokeRefreshToken(tokenHash);
      }
      res.json({ message: "Logout realizado com sucesso." });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) throw createError(404, "Usuário não encontrado.");
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  // Apenas admin: criar novo usuário
  async createUser(req, res, next) {
    try {
      const { name, email, password, role, phone } = req.body;

      if (!name || !email || !password) {
        throw createError(400, "Nome, email e senha são obrigatórios.");
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await UserModel.create({ name, email, password_hash, role, phone });
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
};
