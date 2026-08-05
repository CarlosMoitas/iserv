import { createHmac } from "crypto";
import express from "express";
import { prisma } from "../lib/prisma.js";

/**
 * WhatsApp Cloud API (Meta) webhook.
 *
 * Multi-tenant: resolve empresa via Integracao:
 *  - Integracao.tipo = "WHATSAPP"
 *  - Integracao.ativo = true
 *  - Integracao.configuracao.phoneNumberId = metadata.phone_number_id
 *  - Integracao.configuracao.verifyToken
 *  - Integracao.configuracao.accessToken
 *
 * IA opcional por empresa:
 *  - Integracao.configuracao.ai.enabled = true|false
 *  - Integracao.configuracao.ai.openaiApiKey (opcional; pode vir de env fallback)
 *  - Integracao.configuracao.ai.model (default: gpt-4o-mini)
 */

const router = express.Router();

function normalizePhone(from) {
  // Meta envia algo como: "5511999999999"
  return String(from || "").replace(/\D/g, "");
}

function getTextFromMessage(message) {
  if (!message) return "";
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.interactive?.button_reply?.title)
    return message.interactive.button_reply.title;
  if (message.interactive?.list_reply?.title)
    return message.interactive.list_reply.title;
  return "";
}

async function sendWhatsAppText({ accessToken, phoneNumberId, to, text }) {
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    const error = new Error(
      `Falha ao enviar mensagem WhatsApp: ${response.status} ${payload}`,
    );
    error.statusCode = 502;
    throw error;
  }
}

function isHandoffRequested(text) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("humano") ||
    t.includes("atendente") ||
    t.includes("pessoa") ||
    t.includes("reclama") ||
    t.includes("supervisor")
  );
}

async function openaiChat({ apiKey, model, system, user }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 250,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    const error = new Error(
      `Falha OpenAI: ${response.status} ${payload}`.slice(0, 1200),
    );
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content || "";
}

function buildSystemPrompt(empresaNome) {
  return [
    `Você é um atendente humano (nome: Ana) da empresa "${empresaNome}".`,
    "Fale em pt-BR, educado, objetivo, respostas curtas (1-3 frases).",
    "Se não tiver certeza, peça esclarecimento ou ofereça falar com um atendente humano.",
    "Objetivo: ajudar a agendar serviços e responder dúvidas básicas.",
    "Nunca invente informações de preço/horário se não forem fornecidas.",
  ].join("\n");
}

async function decideNextAction({ empresa, text, conversation }) {
  // Heurísticas simples + IA opcional para humanização/entendimento
  const stage = conversation?.stage || "START";
  const contexto = conversation?.contexto || {};

  if (isHandoffRequested(text)) {
    return {
      type: "HANDOFF",
      reply:
        "Entendi. Vou chamar um atendente humano para te ajudar. Só um instante.",
      newStage: stage,
      newContexto: contexto,
      needsHuman: true,
    };
  }

  // Fluxo guiado MVP
  if (stage === "START") {
    return {
      type: "ASK_NAME",
      reply:
        "Olá! Eu sou a Ana do atendimento. Para te ajudar melhor, qual seu nome?",
      newStage: "ASK_NAME",
      newContexto: contexto,
    };
  }

  if (stage === "ASK_NAME") {
    const nome = text?.trim();
    if (!nome || nome.length < 2) {
      return {
        type: "ASK_NAME",
        reply: "Pode me informar seu nome, por favor?",
        newStage: "ASK_NAME",
        newContexto: contexto,
      };
    }

    return {
      type: "ASK_SERVICE",
      reply:
        "Perfeito, " +
        nome +
        ". Qual serviço você quer agendar? (me diga o nome do serviço)",
      newStage: "ASK_SERVICE",
      newContexto: { ...contexto, nome },
    };
  }

  if (stage === "ASK_SERVICE") {
    const servicos = await prisma.servico.findMany({
      where: { empresaId: empresa.id, ativo: true },
      select: { id: true, nome: true, duracaoMinutos: true },
      orderBy: { nome: "asc" },
      take: 20,
    });

    const user = (text || "").toLowerCase();
    const chosen =
      servicos.find((s) => s.nome.toLowerCase() === user) ||
      servicos.find((s) => s.nome.toLowerCase().includes(user)) ||
      null;

    if (!chosen) {
      const lista = servicos.slice(0, 8).map((s) => `- ${s.nome}`).join("\n");
      return {
        type: "ASK_SERVICE",
        reply:
          "Não encontrei esse serviço. Você pode escolher um destes?\n" +
          (lista || "- (nenhum serviço cadastrado)"),
        newStage: "ASK_SERVICE",
        newContexto: contexto,
      };
    }

    return {
      type: "ASK_DATETIME",
      reply:
        "Ótimo. Qual dia e horário você prefere? (ex: 12/08 15h ou amanhã 10h)",
      newStage: "ASK_DATETIME",
      newContexto: {
        ...contexto,
        servicoId: chosen.id,
        servicoNome: chosen.nome,
        duracaoMinutos: chosen.duracaoMinutos || 60,
      },
    };
  }

  if (stage === "ASK_DATETIME") {
    // MVP: sem NLP robusto. Se IA estiver ligada, vamos pedir para normalizar uma data.
    return {
      type: "CONFIRM",
      reply:
        "Perfeito. Só para confirmar: você quer agendar " +
        (contexto.servicoNome || "o serviço") +
        " para \"" +
        text +
        "\". Está correto? (sim/não)",
      newStage: "CONFIRM",
      newContexto: { ...contexto, datetimeRaw: text },
    };
  }

  if (stage === "CONFIRM") {
    const t = (text || "").toLowerCase();
    if (t.startsWith("n")) {
      return {
        type: "ASK_DATETIME",
        reply:
          "Sem problema. Me diga novamente o dia e horário preferido (ex: 12/08 15h).",
        newStage: "ASK_DATETIME",
        newContexto: { ...contexto, datetimeRaw: undefined },
      };
    }

    if (!t.startsWith("s")) {
      return {
        type: "CONFIRM",
        reply: 'Pode responder "sim" para confirmar ou "não" para alterar.',
        newStage: "CONFIRM",
        newContexto: contexto,
      };
    }

    return {
      type: "CREATE_APPOINTMENT",
      reply: "Perfeito! Estou registrando seu agendamento. Um instante…",
      newStage: "CONFIRM",
      newContexto: contexto,
    };
  }

  return {
    type: "FALLBACK",
    reply:
      "Desculpe, não entendi. Você quer agendar, ver serviços ou falar com um atendente?",
    newStage: "START",
    newContexto: {},
  };
}

async function createOrGetCliente({ empresaId, telefone, nome }) {
  const existing = await prisma.cliente.findFirst({
    where: { empresaId, telefone },
    select: { id: true, nome: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.cliente.create({
    data: {
      empresaId,
      telefone,
      nome: nome || "Cliente WhatsApp",
      status: "ATIVO",
    },
    select: { id: true, nome: true },
  });
}

function parseDateTimeLoose(text) {
  // MVP simples: aceitar ISO se vier; caso contrário, retorna null.
  // Quando IA estiver ligada, podemos implementar normalização via OpenAI e retornar ISO.
  const t = (text || "").trim();
  const iso = Date.parse(t);
  if (!Number.isNaN(iso)) return new Date(iso);
  return null;
}

// Webhook verification (Meta)
router.get("/webhook", async (request, response) => {
  const mode = request.query["hub.mode"];
  const token = request.query["hub.verify_token"];
  const challenge = request.query["hub.challenge"];

  if (mode !== "subscribe") {
    return response.status(400).send("Invalid mode");
  }

  // Como há 1 número por empresa, o verify token pode variar.
  // Aqui validamos: se existir alguma integracao com verifyToken == token, aceitamos.
  const integration = await prisma.integracao.findFirst({
    where: {
      tipo: "WHATSAPP",
      ativo: true,
      configuracao: { path: ["verifyToken"], equals: token },
    },
    select: { id: true },
  });

  if (!integration) {
    return response.status(403).send("Forbidden");
  }

  return response.status(200).send(challenge);
});

async function validateMetaSignature(request) {
  const signature = request.headers["x-hub-signature-256"];
  const raw = request.rawBody;

  // Se não configurou segredo, não valida (útil no começo)
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return { ok: true, skipped: true };
  }

  if (!signature) {
    return { ok: false, reason: "missing_signature" };
  }

  if (!raw) {
    return { ok: false, reason: "missing_raw_body" };
  }

  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(raw).digest("hex");

  if (signature !== expected) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: true };
}

// Incoming messages
router.post("/webhook", async (request, response, next) => {
  try {
    const signatureCheck = await validateMetaSignature(request);
    if (!signatureCheck.ok) {
      return response.status(403).json({ ok: false, ...signatureCheck });
    }

    const payload = request.body;

    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages || [];
    const metadata = value?.metadata;
    const phoneNumberId = metadata?.phone_number_id;

    if (!phoneNumberId || messages.length === 0) {
      return response.status(200).json({ ok: true });
    }

    // Resolve empresa via integracao.configuracao.phoneNumberId
    const integracao = await prisma.integracao.findFirst({
      where: {
        tipo: "WHATSAPP",
        ativo: true,
        configuracao: { path: ["phoneNumberId"], equals: phoneNumberId },
      },
      select: {
        id: true,
        empresaId: true,
        configuracao: true,
        empresa: { select: { id: true, nome: true } },
      },
    });

    if (!integracao) {
      // Não temos configuração para esse número (empresa não cadastrada)
      return response.status(200).json({ ok: true });
    }

    const config = integracao.configuracao || {};
    const accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      return response.status(200).json({ ok: true });
    }

    const aiEnabled = Boolean(config?.ai?.enabled);
    const openaiKey =
      config?.ai?.openaiApiKey || process.env.OPENAI_API_KEY || "";
    const openaiModel = config?.ai?.model || "gpt-4o-mini";

    for (const message of messages) {
      const from = normalizePhone(message.from);
      const textRaw = getTextFromMessage(message);

      // Buscar/atualizar conversa
      const conversa = await prisma.conversaWhatsApp.upsert({
        where: {
          empresaId_telefone: { empresaId: integracao.empresaId, telefone: from },
        },
        create: {
          empresaId: integracao.empresaId,
          telefone: from,
          stage: "START",
          contexto: {},
        },
        update: { ultimoContato: new Date() },
      });

      let text = textRaw;

      // Humanização: se IA ligada, reescreve/normaliza entrada (leve) quando texto for grande/solto
      if (aiEnabled && openaiKey && textRaw && textRaw.length > 0) {
        const system = buildSystemPrompt(integracao.empresa.nome);
        const user = [
          "Interprete a mensagem do cliente e devolva uma versão curta (máx 160 caracteres) mantendo o sentido.",
          "Mensagem:",
          textRaw,
        ].join("\n");
        const normalized = await openaiChat({
          apiKey: openaiKey,
          model: openaiModel,
          system,
          user,
        });
        if (normalized) text = normalized;
      }

      const action = await decideNextAction({
        empresa: integracao.empresa,
        text,
        conversation: conversa,
      });

      // Atualizar estado
      await prisma.conversaWhatsApp.update({
        where: { id: conversa.id },
        data: {
          stage: action.newStage,
          contexto: action.newContexto,
          needsHuman: Boolean(action.needsHuman),
          ultimoContato: new Date(),
        },
      });

      // Se for criar agendamento, cria antes de enviar confirmação final
      if (action.type === "CREATE_APPOINTMENT") {
        const contexto = action.newContexto || {};
        const nome = contexto.nome || "Cliente WhatsApp";

        const cliente = await createOrGetCliente({
          empresaId: integracao.empresaId,
          telefone: from,
          nome,
        });

        const start = parseDateTimeLoose(contexto.datetimeRaw);
        const duracao = Number(contexto.duracaoMinutos || 60);
        const end = start ? new Date(start.getTime() + duracao * 60 * 1000) : null;

        if (!start || !end) {
          await sendWhatsAppText({
            accessToken,
            phoneNumberId,
            to: from,
            text:
              "Consegui registrar seu pedido, mas não entendi o horário. Você pode enviar a data/hora em formato 2026-08-12 15:00?",
          });
          continue;
        }

        await prisma.agendamento.create({
          data: {
            empresaId: integracao.empresaId,
            clienteId: cliente.id,
            servicoId: contexto.servicoId || null,
            titulo: `Agendamento WhatsApp - ${cliente.nome}`,
            inicio: start,
            fim: end,
            status: "AGENDADO",
            observacoes: "Criado via WhatsApp (robô).",
          },
        });

        await sendWhatsAppText({
          accessToken,
          phoneNumberId,
          to: from,
          text:
            "Agendamento registrado! Um atendente pode confirmar com você em breve. Se quiser falar com humano agora, responda: atendente.",
        });

        // Reinicia fluxo
        await prisma.conversaWhatsApp.update({
          where: {
            empresaId_telefone: { empresaId: integracao.empresaId, telefone: from },
          },
          data: { stage: "START", contexto: {} },
        });

        continue;
      }

      await sendWhatsAppText({
        accessToken,
        phoneNumberId,
        to: from,
        text: action.reply,
      });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export { router as whatsappRouter };
