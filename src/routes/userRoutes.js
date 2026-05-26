import express from "express";
import { pool } from "../database/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");

    res.json(result.rows);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Erro ao buscar usuários",
    });
  }
});

export default router;