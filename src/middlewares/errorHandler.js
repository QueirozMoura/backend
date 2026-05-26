// Middleware global de tratamento de erros
export function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Erros de constraint do PostgreSQL
  if (err.code === "23505") {
    const detail = err.detail || "";
    const field = detail.match(/\(([^)]+)\)/)?.[1] || "campo";
    return res.status(409).json({ error: `Valor duplicado: ${field} já existe.` });
  }

  if (err.code === "23503") {
    return res.status(400).json({ error: "Referência inválida: registro relacionado não encontrado." });
  }

  if (err.code === "23502") {
    return res.status(400).json({ error: "Campo obrigatório não informado." });
  }

  // Erros de validação manual
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // Erro genérico
  res.status(500).json({ error: "Erro interno do servidor." });
}

// Helper: cria um erro com status HTTP
export function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
