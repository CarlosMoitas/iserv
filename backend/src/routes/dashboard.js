import express from "express";
import { authRequired, assinaturaRequired } from "../middlewares/auth.js";
import { prisma } from "../lib/prisma.js";

const dashboardRouter = express.Router();

dashboardRouter.use(authRequired);
dashboardRouter.use(assinaturaRequired);

dashboardRouter.get("/", async (request, response, next) => {
  try {
    const { empresaId } = request.auth;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
      clientes,
      ordensAbertas,
      ordensConcluidas,
      receita,
      agendaDoDia,
      clientesRecentes,
    ] = await Promise.all([
      prisma.cliente.count({
        where: { empresaId, status: "ATIVO" },
      }),
      prisma.ordemServico.count({
        where: {
          empresaId,
          status: { in: ["ABERTA", "EM_ANDAMENTO"] },
        },
      }),
      prisma.ordemServico.count({
        where: { empresaId, status: "CONCLUIDA" },
      }),
      prisma.pagamento.aggregate({
        _sum: { valor: true },
        where: {
          empresaId,
          tipo: "ENTRADA",
          status: "PAGO",
          dataPagamento: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      prisma.agendamento.findMany({
        where: {
          empresaId,
          inicio: { gte: dayStart, lt: dayEnd },
          status: { not: "CANCELADO" },
        },
        include: {
          cliente: { select: { id: true, nome: true, telefone: true } },
          servico: { select: { id: true, nome: true } },
        },
        orderBy: { inicio: "asc" },
        take: 10,
      }),
      prisma.cliente.findMany({
        where: { empresaId },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return response.json({
      metrics: {
        clientes,
        ordensAbertas,
        ordensConcluidas,
        receitaMes: Number(receita._sum.valor || 0),
      },
      agendaDoDia,
      clientesRecentes,
    });
  } catch (error) {
    return next(error);
  }
});

export { dashboardRouter };
