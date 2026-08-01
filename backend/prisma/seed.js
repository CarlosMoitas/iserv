import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultModules = [
  "dashboard", "clientes", "agenda", "ordens-servico",
  "orcamentos", "financeiro", "produtos", "relatorios",
  "usuarios", "configuracoes", "integracoes", "whatsapp",
];

async function main() {
  console.log("🌱 Iniciando seed...");

  const senhaHash = await bcrypt.hash("senha123456", 12);

  const empresa = await prisma.empresa.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      nome: "Empresa Demo",
      slug: "demo",
      email: "admin@demo.com",
      telefone: "(11) 99999-0000",
      configuracao: { create: {} },
      modulos: { create: defaultModules.map((chave) => ({ chave })) },
    },
  });

  const usuario = await prisma.usuario.upsert({
    where: { empresaId_email: { empresaId: empresa.id, email: "admin@demo.com" } },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: "Administrador Demo",
      email: "admin@demo.com",
      senhaHash,
      cargo: "ADMIN",
    },
  });

  const joao = await prisma.cliente.upsert({
    where: { id: `seed-cliente-1-${empresa.id}` },
    update: {},
    create: {
      id: `seed-cliente-1-${empresa.id}`,
      empresaId: empresa.id,
      nome: "João Silva",
      email: "joao@email.com",
      telefone: "(11) 98888-0001",
    },
  });

  const maria = await prisma.cliente.upsert({
    where: { id: `seed-cliente-2-${empresa.id}` },
    update: {},
    create: {
      id: `seed-cliente-2-${empresa.id}`,
      empresaId: empresa.id,
      nome: "Maria Souza",
      email: "maria@email.com",
      telefone: "(11) 98888-0002",
    },
  });

  await prisma.cliente.upsert({
    where: { id: `seed-cliente-3-${empresa.id}` },
    update: {},
    create: {
      id: `seed-cliente-3-${empresa.id}`,
      empresaId: empresa.id,
      nome: "Carlos Oliveira",
      email: "carlos@email.com",
      telefone: "(11) 98888-0003",
    },
  });

  const servico = await prisma.servico.upsert({
    where: { id: `seed-servico-1-${empresa.id}` },
    update: {},
    create: {
      id: `seed-servico-1-${empresa.id}`,
      empresaId: empresa.id,
      nome: "Serviço Padrão",
      descricao: "Serviço demonstração",
      preco: 150.0,
      duracaoMinutos: 60,
    },
  });

  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 10, 0);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 11, 0);

  await prisma.agendamento.upsert({
    where: { id: `seed-agend-1-${empresa.id}` },
    update: {},
    create: {
      id: `seed-agend-1-${empresa.id}`,
      empresaId: empresa.id,
      clienteId: joao.id,
      servicoId: servico.id,
      titulo: "Atendimento João",
      inicio,
      fim,
    },
  });

  await prisma.ordemServico.upsert({
    where: { empresaId_numero: { empresaId: empresa.id, numero: 1 } },
    update: {},
    create: {
      empresaId: empresa.id,
      clienteId: maria.id,
      responsavelId: usuario.id,
      numero: 1,
      titulo: "OS de demonstração",
      status: "ABERTA",
      valorTotal: 350.0,
    },
  });

  await prisma.pagamento.upsert({
    where: { id: `seed-pag-1-${empresa.id}` },
    update: {},
    create: {
      id: `seed-pag-1-${empresa.id}`,
      empresaId: empresa.id,
      clienteId: joao.id,
      descricao: "Serviço realizado",
      tipo: "ENTRADA",
      status: "PAGO",
      valor: 150.0,
      dataPagamento: new Date(),
    },
  });

  console.log("✅ Seed concluído!");
  console.log("   Empresa: demo");
  console.log("   E-mail:  admin@demo.com");
  console.log("   Senha:   senha123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
