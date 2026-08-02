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

const agendamentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
  telefone: z.string().trim().min(8, "Informe um telefone válido.").optional().or(z.literal("")),
  servico: z.string().trim().max(160).optional().or(z.literal("")),
  data: z.string().trim().max(10).optional().or(z.literal("")), // formato YYYY-MM-DD
  turno: z.string().trim().max(20).optional().or(z.literal("")),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

const TURNO_HORA = { Manhã: 9, Tarde: 14, Noite: 18 };

function montarHorarioAgendamento(data, turno) {
  const hora = TURNO_HORA[turno] ?? 10;
  let inicio;

  if (data) {
    const [ano, mes, dia] = data.split("-").map(Number);
    inicio = new Date(ano, (mes || 1) - 1, dia || 1, hora, 0, 0);
  } else {
    inicio = new Date();
    inicio.setDate(inicio.getDate() + 1);
    inicio.setHours(hora, 0, 0, 0);
  }

  const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
  return { inicio, fim };
}

function gerarProtocolo(agendamentoId) {
  return "AG-" + agendamentoId.slice(-8).toUpperCase();
}

function extrairSufixoProtocolo(protocolo) {
  const match = /^AG-([A-Z0-9]{8})$/i.exec(protocolo.trim());
  return match ? match[1].toLowerCase() : null;
}

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

// POST /public/:slug/agendamentos -> cria (ou reaproveita) um Cliente e um
// Agendamento real vinculado à empresa. Esse agendamento aparece na tela
// "Agenda" do painel administrativo, exatamente como os criados manualmente
// pelo empresário. O protocolo retornado é derivado do próprio ID do
// agendamento, então pode ser consultado publicamente em qualquer navegador.
publicRouter.post("/:slug/agendamentos", rateLimit, async (request, response, next) => {
  try {
    const empresa = await getEmpresaBySlugOrFail(request.params.slug);
    const data = agendamentoSchema.parse(request.body);

    if (data.website) {
      // Honeypot acionado: resposta "de sucesso" falsa para não alertar o bot.
      return response.status(201).json({ ok: true, protocolo: "AG-00000000" });
    }

    if (!data.email && !data.telefone) {
      return response.status(400).json({
        error: "Informe ao menos um e-mail ou telefone para contato.",
        code: "VALIDATION_ERROR",
      });
    }

    // Tenta reaproveitar um cliente já existente pelo e-mail/telefone informado,
    // para não duplicar cadastros de quem já solicitou orçamento antes.
    let cliente = null;

    if (data.email) {
      cliente = await prisma.cliente.findFirst({
        where: { empresaId: empresa.id, email: data.email },
        select: { id: true },
      });
    }

    if (!cliente && data.telefone) {
      cliente = await prisma.cliente.findFirst({
        where: { empresaId: empresa.id, telefone: data.telefone },
        select: { id: true },
      });
    }

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          empresaId: empresa.id,
          nome: data.nome,
          email: data.email || undefined,
          telefone: data.telefone || undefined,
          observacoes: "Cliente criado via agendamento no site institucional.",
        },
        select: { id: true },
      });
    }

    const { inicio, fim } = montarHorarioAgendamento(data.data, data.turno);
    const resumoServico = data.servico || "Atendimento geral";
    const resumoTurno = data.turno || "a combinar";

    const agendamento = await prisma.agendamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cliente.id,
        titulo: `[Site] ${resumoServico}`,
        inicio,
        fim,
        status: "AGENDADO",
        observacoes:
          `Agendamento solicitado pelo cliente via site institucional. ` +
          `Turno preferencial: ${resumoTurno}.` +
          (data.observacoes ? ` Observações: ${data.observacoes}` : ""),
      },
      select: { id: true },
    });

    const protocolo = gerarProtocolo(agendamento.id);

    return response.status(201).json({ ok: true, protocolo });
  } catch (error) {
    return next(error);
  }
});

// GET /public/:slug/agendamentos/:protocolo -> consulta pública do status de
// um agendamento a partir do protocolo recebido pelo cliente.
publicRouter.get("/:slug/agendamentos/:protocolo", async (request, response, next) => {
  try {
    const empresa = await getEmpresaBySlugOrFail(request.params.slug);
    const sufixo = extrairSufixoProtocolo(request.params.protocolo);

    if (!sufixo) {
      return response.status(404).json({
        error: "Protocolo inválido.",
        code: "NOT_FOUND",
      });
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: { empresaId: empresa.id, id: { endsWith: sufixo } },
      select: {
        id: true,
        titulo: true,
        inicio: true,
        status: true,
        createdAt: true,
      },
      take: 5,
    });

    const agendamento = agendamentos.find(
      (item) => gerarProtocolo(item.id).toLowerCase() === request.params.protocolo.toLowerCase(),
    );

    if (!agendamento) {
      return response.status(404).json({
        error: "Nenhuma solicitação encontrada para este protocolo.",
        code: "NOT_FOUND",
      });
    }

    return response.json({
      protocolo: gerarProtocolo(agendamento.id),
      titulo: agendamento.titulo,
      inicio: agendamento.inicio,
      status: agendamento.status,
      criadoEm: agendamento.createdAt,
    });
  } catch (error) {
    return next(error);
  }
});

export { publicRouter };
