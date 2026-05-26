import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_production";

// Verifica se o token JWT é válido e injeta o usuário na requisição
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado." });
    }
    return res.status(401).json({ error: "Token inválido." });
  }
}

// Restringe acesso a roles específicas
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado. Permissão insuficiente." });
    }
    next();
  };
}

// Utilitário para gerar tokens JWT
export function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
