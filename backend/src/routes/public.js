import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const publicRouter = express.Router();

// Rate limiting simples em memória (por IP) para evitar spam no formulário público.
const submissionsByIp = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

function rateLimit(request, response, next) {
  const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.ip;
  const now = Date.now();
  const entry = submissionsByIp.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }

  entry.count += 1;
  submissionsByIp.set(ip, entry);

  if (entry.count > MAX_SUBMISSIONS_PER_WINDOW) {
    return response.status(429).json({
      error: "Muitas tentativas. Aguarde um momento e tente novamente.",
      code: "RATE_LIMITED",
    });
  }

  return next();
}

const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
  telefone: z.string().trim().min(8, "Informe um telefone válido.").optional().or(z.literal("")),
  mensagem: z.string().trim().max(2000).optional().or(z.literal("")),
  // honeypot: campo invisível no formulário; se vier preenchido, é bot.
  website: z.string().max(0).optional().or(z.literal("")),
});

async function getEmpresaBySlugOrFail(slug) {
  const empresa = await prisma.empresa.findUnique({
    where: { slug },
    select: {
      id: true,
      nome: true,
      slug: true,
      email: true,
      telefone: true,
      logoUrl: true,
    },
  });

  if (!empresa) {
    const error = new Error("Empresa não encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return empresa;
}

// GET /public/:slug -> dados públicos básicos da empresa (para a landing page consumir).
publicRouter.get("/:slug", async (request, response, next) => {
  try {
    const empresa = await getEmpresaBySlugOrFail(request.params.slug);
    return response.json({
      nome: empresa.nome,
      slug: empresa.slug,
      email: empresa.email,
      telefone: empresa.telefone,
      logoUrl: empresa.logoUrl,
    });
  } catch (error) {
    return next(error);
  }
});

// POST /public/:slug/leads -> cria um Cliente vinculado à empresa a partir do formulário público.
publicRouter.post("/:slug/leads", rateLimit, async (request, response, next) => {
  try {
    const empresa = await getEmpresaBySlugOrFail(request.params.slug);
    const data = leadSchema.parse(request.body);

    if (data.website) {
      // Honeypot acionado: resposta "de sucesso" falsa para não alertar o bot.
      return response.status(201).json({ ok: true });
    }

    if (!data.email && !data.telefone) {
      return response.status(400).json({
        error: "Informe ao menos um e-mail ou telefone para contato.",
        code: "VALIDATION_ERROR",
      });
    }

    const cliente = await prisma.cliente.create({
      data: {
        empresaId: empresa.id,
        nome: data.nome,
        email: data.email || undefined,
        telefone: data.telefone || undefined,
        observacoes: data.mensagem
          ? `Lead via site institucional: ${data.mensagem}`
          : "Lead capturado via site institucional.",
      },
      select: { id: true },
    });

    return response.status(201).json({ ok: true, id: cliente.id });
  } catch (error) {
    return next(error);
  }
});

export { publicRouter };
