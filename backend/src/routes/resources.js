import bcrypt from "bcrypt";
import express from "express";
import { z } from "zod";
import { authRequired } from "../middlewares/auth.js";
import { prisma } from "../lib/prisma.js";

const resourceDefinitions = {
  cliente: {
    model: "cliente",
    schema: z.object({
      nome: z.string().trim().min(2),
      email: z.string().trim().email().optional().or(z.literal("")),
      telefone: z.string().trim().optional(),
      documento: z.string().trim().optional(),
      observacoes: z.string().trim().optional(),
      status: z.enum(["ATIVO", "INATIVO"]).optional(),
      endereco: z.record(z.string(), z.unknown()).optional(),
    }),
    searchFields: ["nome", "email", "telefone", "documento"],
    orderBy: { createdAt: "desc" },
  },
  servico: {
    model: "servico",
    schema: z.object({
      nome: z.string().trim().min(2),
      descricao: z.string().trim().optional(),
      duracaoMinutos: z.coerce.number().int().positive().optional(),
      preco: z.coerce.number().nonnegative(),
      ativo: z.boolean().optional(),
    }),
    searchFields: ["nome", "descricao"],
    orderBy: { nome: "asc" },
  },
  agendamento: {
    model: "agendamento",
    schema: z.object({
      clienteId: z.string().min(1),
      servicoId: z.string().min(1).optional(),
      usuarioId: z.string().min(1).optional(),
      titulo: z.string().trim().min(2),
      inicio: z.coerce.date(),
      fim: z.coerce.date(),
      status: z
        .enum(["AGENDADO", "CONFIRMADO", "CONCLUIDO", "CANCELADO"])
        .optional(),
      observacoes: z.string().trim().optional(),
    }),
    searchFields: ["titulo"],
    include: {
      cliente: { select: { id: true, nome: true, telefone: true } },
      servico: { select: { id: true, nome: true } },
      usuario: { select: { id: true, nome: true } },
    },
    orderBy: { inicio: "asc" },
  },
  ordemServico: {
    model: "ordemServico",
    schema: z.object({
      clienteId: z.string().min(1),
      responsavelId: z.string().min(1).optional(),
      numero: z.coerce.number().int().positive(),
      titulo: z.string().trim().min(2),
      descricao: z.string().trim().optional(),
      status: z
        .enum(["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"])
        .optional(),
      valorTotal: z.coerce.number().nonnegative().optional(),
    }),
    searchFields: ["titulo", "descricao"],
    include: {
      cliente: { select: { id: true, nome: true, telefone: true } },
      responsavel: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  },
  orcamento: {
    model: "orcamento",
    schema: z.object({
      clienteId: z.string().min(1),
      numero: z.coerce.number().int().positive(),
      validade: z.coerce.date().optional(),
      status: z
        .enum(["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO", "EXPIRADO"])
        .optional(),
      observacoes: z.string().trim().optional(),
      valorTotal: z.coerce.number().nonnegative().optional(),
    }),
    searchFields: ["observacoes"],
    include: {
      cliente: { select: { id: true, nome: true, telefone: true } },
    },
    orderBy: { createdAt: "desc" },
  },
  produto: {
    model: "produto",
    schema: z.object({
      nome: z.string().trim().min(2),
      sku: z.string().trim().optional(),
      descricao: z.string().trim().optional(),
      estoque: z.coerce.number().nonnegative().optional(),
      estoqueMin: z.coerce.number().nonnegative().optional(),
      precoVenda: z.coerce.number().nonnegative(),
      custo: z.coerce.number().nonnegative().optional(),
      ativo: z.boolean().optional(),
    }),
    searchFields: ["nome", "sku", "descricao"],
    orderBy: { nome: "asc" },
  },
  pagamento: {
    model: "pagamento",
    schema: z.object({
      clienteId: z.string().min(1).optional(),
      ordemId: z.string().min(1).optional(),
      produtoId: z.string().min(1).optional(),
      descricao: z.string().trim().min(2),
      tipo: z.enum(["ENTRADA", "SAIDA"]),
      status: z.enum(["PENDENTE", "PAGO", "CANCELADO"]).optional(),
      valor: z.coerce.number().positive(),
      vencimento: z.coerce.date().optional(),
      dataPagamento: z.coerce.date().optional(),
    }),
    searchFields: ["descricao"],
    include: {
      cliente: { select: { id: true, nome: true } },
      ordem: { select: { id: true, numero: true, titulo: true } },
      produto: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  },
  usuario: {
    model: "usuario",
    schema: z.object({
      nome: z.string().trim().min(2),
      email: z.string().trim().email(),
      senha: z.string().min(8).optional(),
      cargo: z.string().trim().min(2).optional(),
      status: z.enum(["ATIVO", "INATIVO"]).optional(),
      avatarUrl: z.string().url().optional().or(z.literal("")),
    }),
    searchFields: ["nome", "email", "cargo"],
    orderBy: { nome: "asc" },
  },
  configuracao: {
    model: "configuracao",
    schema: z.object({
      tema: z.enum(["light", "dark"]).optional(),
      moeda: z.string().trim().length(3).optional(),
      timezone: z.string().trim().min(3).optional(),
      notificacoes: z.record(z.string(), z.unknown()).optional(),
      preferencias: z.record(z.string(), z.unknown()).optional(),
    }),
    orderBy: { createdAt: "desc" },
  },
  integracao: {
    model: "integracao",
    schema: z.object({
      tipo: z.string().trim().min(2),
      nome: z.string().trim().min(2),
      ativo: z.boolean().optional(),
      configuracao: z.record(z.string(), z.unknown()).optional(),
    }),
    searchFields: ["tipo", "nome"],
    orderBy: { nome: "asc" },
  },
};

function getDefinition(resource) {
  const definition = resourceDefinitions[resource];

  if (!definition) {
    const error = new Error("Recurso não configurado.");
    error.statusCode = 404;
    throw error;
  }

  return definition;
}

async function normalizeData(resource, data) {
  if (resource !== "usuario") {
    return data;
  }

  const { senha, ...userData } = data;

  if (senha) {
    return {
      ...userData,
      senhaHash: await bcrypt.hash(senha, 12),
    };
  }

  return userData;
}

function buildWhere(empresaId, definition, request) {
  const where = { empresaId };
  const search = request.query.search?.trim();

  if (search && definition.searchFields?.length) {
    where.OR = definition.searchFields.map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    }));
  }

  return where;
}

function sanitizeUser(resource, item) {
  if (resource !== "usuario") {
    return item;
  }

  const { senhaHash: _senhaHash, ...safeUser } = item;
  return safeUser;
}

async function assertRelatedRecordsBelongToTenant(resource, data, empresaId) {
  const checks = {
    clienteId: ["cliente", "id"],
    servicoId: ["servico", "id"],
    usuarioId: ["usuario", "id"],
    responsavelId: ["usuario", "id"],
    ordemId: ["ordemServico", "id"],
    produtoId: ["produto", "id"],
  };

  const resourceDefinition = resourceDefinitions[resource];

  for (const [field, [model, fieldName]] of Object.entries(checks)) {
    if (!data[field]) {
      continue;
    }

    const related = await prisma[model].findFirst({
      where: { [fieldName]: data[field], empresaId },
      select: { id: true },
    });

    if (!related) {
      const error = new Error(`Relacionamento inválido: ${field}.`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (resourceDefinition?.model === "usuario" && data.email) {
    return;
  }
}

function resourceRouter(resource) {
  const definition = getDefinition(resource);
  const router = express.Router();

  router.use(authRequired);

  router.get("/", async (request, response, next) => {
    try {
      const { empresaId } = request.auth;
      const page = Math.max(Number(request.query.page) || 1, 1);
      const pageSize = Math.min(
        Math.max(Number(request.query.pageSize) || 20, 1),
        100,
      );
      const where = buildWhere(empresaId, definition, request);
      const client = prisma[definition.model];

      const [items, total] = await Promise.all([
        client.findMany({
          where,
          include: definition.include,
          orderBy: definition.orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          ...(resource === "usuario" ? { omit: { senhaHash: true } } : {}),
        }),
        client.count({ where }),
      ]);

      return response.json({
        data: items.map((item) => sanitizeUser(resource, item)),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const item = await prisma[definition.model].findFirst({
        where: { id: request.params.id, empresaId: request.auth.empresaId },
        include: definition.include,
        ...(resource === "usuario" ? { omit: { senhaHash: true } } : {}),
      });

      if (!item) {
        return response.status(404).json({
          error: "Registro não encontrado.",
          code: "NOT_FOUND",
        });
      }

      return response.json(sanitizeUser(resource, item));
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const data = definition.schema.parse(request.body);
      const { empresaId } = request.auth;
      await assertRelatedRecordsBelongToTenant(resource, data, empresaId);

      const item = await prisma[definition.model].create({
        data: {
          ...(await normalizeData(resource, data)),
          empresaId,
        },
        include: definition.include,
      });

      return response.status(201).json(sanitizeUser(resource, item));
    } catch (error) {
      return next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    try {
      const data = definition.schema.partial().parse(request.body);
      const { empresaId } = request.auth;
      await assertRelatedRecordsBelongToTenant(resource, data, empresaId);

      const existing = await prisma[definition.model].findFirst({
        where: { id: request.params.id, empresaId },
        select: { id: true },
      });

      if (!existing) {
        return response.status(404).json({
          error: "Registro não encontrado.",
          code: "NOT_FOUND",
        });
      }

      const item = await prisma[definition.model].update({
        where: { id: existing.id },
        data: await normalizeData(resource, data),
        include: definition.include,
      });

      return response.json(sanitizeUser(resource, item));
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const existing = await prisma[definition.model].findFirst({
        where: { id: request.params.id, empresaId: request.auth.empresaId },
        select: { id: true },
      });

      if (!existing) {
        return response.status(404).json({
          error: "Registro não encontrado.",
          code: "NOT_FOUND",
        });
      }

      await prisma[definition.model].delete({ where: { id: existing.id } });
      return response.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

export { resourceRouter };
