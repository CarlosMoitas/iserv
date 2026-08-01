import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { resourceRouter } from "./routes/resources.js";
import { publicRouter } from "./routes/public.js";

const app = express();
const port = Number(process.env.PORT || 3333);

app.use(express.json({ limit: "2mb" }));

// Rotas públicas (sites institucionais/landing pages) aceitam qualquer origem,
// pois cada empresa pode hospedar seu site em um domínio diferente.
app.use("/public", cors({ origin: true, credentials: false }), publicRouter);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);

      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        return callback(null, true);
      }

      if (origin.endsWith(".onrender.com") || origin.startsWith("http://localhost")) {
        return callback(null, true);
      }

      return callback(new Error(`CORS bloqueado: ${origin}`));
    },
    credentials: true,
  }),
);

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "iserv-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/clientes", resourceRouter("cliente"));
app.use("/servicos", resourceRouter("servico"));
app.use("/agendamentos", resourceRouter("agendamento"));
app.use("/ordens-servico", resourceRouter("ordemServico"));
app.use("/orcamentos", resourceRouter("orcamento"));
app.use("/produtos", resourceRouter("produto"));
app.use("/pagamentos", resourceRouter("pagamento"));
app.use("/usuarios", resourceRouter("usuario"));
app.use("/configuracoes", resourceRouter("configuracao"));
app.use("/integracoes", resourceRouter("integracao"));

app.use((_request, response) => {
  response.status(404).json({
    error: "Recurso não encontrado.",
    code: "NOT_FOUND",
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);

  if (error?.name === "ZodError") {
    return response.status(400).json({
      error: "Dados inválidos.",
      code: "VALIDATION_ERROR",
      details: error.issues,
    });
  }

  if (error?.code === "P2002") {
    return response.status(409).json({
      error: "Registro duplicado.",
      code: "CONFLICT",
    });
  }

  return response.status(error?.statusCode || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Erro interno do servidor."
        : error?.message || "Erro interno do servidor.",
    code: "INTERNAL_ERROR",
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`iServ API disponível em http://localhost:${port}`);
  });
}

export { app };
