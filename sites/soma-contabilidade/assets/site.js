/*
  iServ · Landing Page — lógica de interação (Experiência do Cliente Final)

  Este script é intencionalmente "vanilla JS" e não depende de build step,
  para que qualquer empresa hospede sua própria landing page facilmente.

  Responsabilidades:
  1. Resolver URLs de API/painel (local vs produção).
  2. Enviar formulário de contato -> POST /public/:slug/leads (cria Cliente no iServ).
  3. Botão "Área do Cliente" -> login do painel iServ (empresário).
  4. Botão flutuante do WhatsApp -> abre conversa direta.
  5. Widget de chat com IA (placeholder pronto para plugar um atendimento
     inteligente real no futuro: consulta disponibilidade, agenda horário,
     registra tudo no iServ).
*/

(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // 1) Configuração de ambiente
  // ---------------------------------------------------------------------
  // ATENÇÃO: ajuste estas constantes para o domínio real ao publicar o site.
  const PRODUCTION_API_URL = "https://iserv-api.onrender.com";
  const PRODUCTION_PAINEL_URL = "https://iserv-l1ji.onrender.com";
  const EMPRESA_SLUG = "soma-contabilidade";
  const WHATSAPP_NUMBER = "5511982005101";
  const WHATSAPP_MESSAGE = "Olá! Gostaria de mais informações sobre os serviços contábeis.";

  const isLocalEnvironment =
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const API_BASE_URL = isLocalEnvironment ? "http://localhost:3333" : PRODUCTION_API_URL;
  const PAINEL_URL = isLocalEnvironment ? "http://localhost:5173" : PRODUCTION_PAINEL_URL;

  // ---------------------------------------------------------------------
  // 2) Links dinâmicos (admin + whatsapp)
  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    const adminLink = document.getElementById("adminAreaLink");
    if (adminLink) adminLink.href = PAINEL_URL + "/login";

    const whatsappLinks = document.querySelectorAll("[data-whatsapp-link]");
    const waHref =
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(WHATSAPP_MESSAGE);
    whatsappLinks.forEach((el) => el.setAttribute("href", waHref));
  });

  // ---------------------------------------------------------------------
  // 3) Formulário de contato / lead
  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("leadForm");
    if (!form) return;

    const submitBtn = document.getElementById("submitBtn");
    const formMsg = document.getElementById("formMsg");

    function showMessage(text, type) {
      formMsg.textContent = text;
      formMsg.style.display = "block";
      formMsg.className = "mt-3 small text-center " + (type === "success" ? "text-success" : "text-danger");
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      formMsg.style.display = "none";

      const payload = {
        nome: document.getElementById("nome").value.trim(),
        email: document.getElementById("email").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        mensagem: document.getElementById("mensagem").value.trim(),
        website: document.getElementById("website").value.trim(),
      };

      if (!payload.nome || payload.nome.length < 2) {
        showMessage("Por favor, informe seu nome completo.", "error");
        return;
      }

      if (!payload.email && !payload.telefone) {
        showMessage("Informe ao menos um e-mail ou telefone para contato.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Enviando...';

      try {
        const response = await fetch(API_BASE_URL + "/public/" + EMPRESA_SLUG + "/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Não foi possível enviar sua mensagem.");
        }

        showMessage("Mensagem enviada com sucesso! Em breve nossa equipe entrará em contato.", "success");
        form.reset();
      } catch (error) {
        showMessage(error.message || "Erro ao enviar. Tente novamente em alguns instantes.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-envelope me-2"></i> Enviar mensagem';
      }
    });
  });

  // ---------------------------------------------------------------------
  // 3.1) Agendamento de atendimento -> POST /public/:slug/agendamentos
  //
  // Cria um Cliente (ou reaproveita um existente) e um Agendamento real no
  // iServ, visível na tela "Agenda" do painel administrativo da empresa. O
  // protocolo é gerado pelo próprio backend a partir do ID do agendamento,
  // então pode ser consultado publicamente em qualquer navegador/dispositivo.
  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("agendaForm");
    if (!form) return;

    const submitBtn = document.getElementById("agendaSubmitBtn");
    const msg = document.getElementById("agendaMsg");
    const protocoloBox = document.getElementById("agendaProtocolo");
    const protocoloValue = document.getElementById("agendaProtocoloValue");
    const protocoloCopyBtn = document.getElementById("agendaProtocoloCopy");

    function showMsg(text, type) {
      msg.textContent = text;
      msg.style.display = "block";
      msg.className = "mt-3 small text-center " + (type === "success" ? "text-success" : "text-danger");
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      msg.style.display = "none";
      protocoloBox.style.display = "none";

      const payload = {
        nome: document.getElementById("agenda-nome").value.trim(),
        telefone: document.getElementById("agenda-telefone").value.trim(),
        email: document.getElementById("agenda-email").value.trim(),
        servico: document.getElementById("agenda-servico").value,
        data: document.getElementById("agenda-data").value,
        turno: document.getElementById("agenda-turno").value,
        observacoes: document.getElementById("agenda-observacoes").value.trim(),
        website: document.getElementById("agenda-website").value.trim(),
      };

      if (!payload.nome || payload.nome.length < 2) {
        showMsg("Por favor, informe seu nome completo.", "error");
        return;
      }
      if (!payload.telefone && !payload.email) {
        showMsg("Informe ao menos um e-mail ou telefone para contato.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Enviando...';

      try {
        const response = await fetch(API_BASE_URL + "/public/" + EMPRESA_SLUG + "/agendamentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Não foi possível confirmar o agendamento.");
        }

        showMsg("Agendamento registrado com sucesso!", "success");
        protocoloValue.textContent = responseData.protocolo;
        protocoloBox.style.display = "block";
        form.reset();
      } catch (error) {
        showMsg(error.message || "Erro ao agendar. Tente novamente em alguns instantes.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-calendar-plus me-2"></i> Confirmar agendamento';
      }
    });

    if (protocoloCopyBtn) {
      protocoloCopyBtn.addEventListener("click", function () {
        const value = protocoloValue.textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(value).catch(() => {});
        }
        protocoloCopyBtn.innerHTML = '<i class="fas fa-check"></i>';
        window.setTimeout(() => {
          protocoloCopyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 1500);
      });
    }
  });

  // ---------------------------------------------------------------------
  // 3.2) Acompanhar solicitação -> GET /public/:slug/agendamentos/:protocolo
  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    const trackForm = document.getElementById("trackForm");
    if (!trackForm) return;

    const trackInput = document.getElementById("trackProtocolo");
    const trackResult = document.getElementById("trackResult");

    const STATUS_LABEL = {
      AGENDADO: "Recebido — aguardando confirmação",
      CONFIRMADO: "Confirmado pela equipe",
      CONCLUIDO: "Atendimento concluído",
      CANCELADO: "Cancelado",
    };

    trackForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const protocolo = trackInput.value.trim().toUpperCase();

      trackResult.innerHTML =
        '<p class="small text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Consultando...</p>';

      try {
        const response = await fetch(
          API_BASE_URL + "/public/" + EMPRESA_SLUG + "/agendamentos/" + encodeURIComponent(protocolo),
        );
        const data = await response.json();

        if (!response.ok) {
          trackResult.innerHTML =
            '<div class="track-result-card not-found">' +
            '<p class="fw-semibold mb-1"><i class="fas fa-circle-exclamation text-danger me-2"></i>' +
            (data.error || "Protocolo não encontrado.") +
            "</p>" +
            '<p class="small text-muted mb-0">Verifique se digitou corretamente ou fale com nossa equipe pelo WhatsApp para confirmar o status.</p>' +
            "</div>";
          return;
        }

        const statusLabel = STATUS_LABEL[data.status] || data.status;
        trackResult.innerHTML =
          '<div class="track-result-card">' +
          '<p class="fw-semibold mb-2"><span class="track-status-dot"></span>' + statusLabel + "</p>" +
          '<p class="small mb-1"><strong>Assunto:</strong> ' + data.titulo + "</p>" +
          '<p class="small mb-1"><strong>Data/horário agendado:</strong> ' +
          new Date(data.inicio).toLocaleString("pt-BR") +
          "</p>" +
          '<p class="small mb-0 text-muted"><strong>Solicitado em:</strong> ' +
          new Date(data.criadoEm).toLocaleString("pt-BR") +
          "</p>" +
          "</div>";
      } catch (error) {
        trackResult.innerHTML =
          '<div class="track-result-card not-found">' +
          '<p class="fw-semibold mb-1"><i class="fas fa-circle-exclamation text-danger me-2"></i>Não foi possível consultar agora.</p>' +
          '<p class="small text-muted mb-0">Tente novamente em alguns instantes.</p>' +
          "</div>";
      }
    });
  });

  // ---------------------------------------------------------------------
  // 4) Widget de chat com IA (placeholder do fluxo de atendimento inteligente)
  //
  // Fluxo alvo (ver visão de produto do iServ):
  //   Cliente clica em "Conversar" -> IA entende necessidade -> consulta
  //   disponibilidade -> agenda horário -> registra tudo no iServ -> painel
  //   administrativo é atualizado automaticamente.
  //
  // Nesta etapa (somente frontend/local) o widget simula a conversa e captura
  // o lead usando a MESMA rota pública de leads, para já refletir no painel.
  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    const fab = document.getElementById("aiChatFab");
    const panel = document.getElementById("aiChatPanel");
    const closeBtn = document.getElementById("aiChatClose");
    const body = document.getElementById("aiChatBody");
    const input = document.getElementById("aiChatInput");
    const sendBtn = document.getElementById("aiChatSend");

    if (!fab || !panel) return;

    let started = false;
    let step = 0; // etapa simples da conversa guiada

    function addMessage(text, who) {
      const div = document.createElement("div");
      div.className = "ai-msg " + (who === "user" ? "user" : "bot");
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    function startConversation() {
      if (started) return;
      started = true;
      addMessage(
        "Olá! 👋 Eu sou o assistente virtual da Soma Contabilidade. Posso te ajudar a entender nossos serviços ou agendar uma conversa com nossa equipe. O que você precisa hoje?",
        "bot",
      );
    }

    function handleUserMessage(text) {
      addMessage(text, "user");

      // Simulação simples de entendimento de intenção — no futuro, aqui entra
      // a integração real com o motor de IA e a API de disponibilidade/agenda.
      window.setTimeout(function () {
        if (step === 0) {
          addMessage(
            "Entendido! Para agilizar, pode me informar seu nome e um telefone ou e-mail? Assim nossa equipe já entra em contato para confirmar o melhor horário.",
            "bot",
          );
          step = 1;
        } else if (step === 1) {
          submitAiLead(text);
          addMessage(
            "Perfeito, recebemos seus dados! ✅ Em breve alguém da equipe vai confirmar o atendimento. Se preferir, também pode falar agora mesmo pelo WhatsApp.",
            "bot",
          );
          step = 2;
        } else {
          addMessage(
            "Já registrei sua solicitação com nossa equipe. Você também pode usar o botão do WhatsApp para uma resposta mais rápida. 😉",
            "bot",
          );
        }
      }, 500);
    }

    async function submitAiLead(rawText) {
      try {
        await fetch(API_BASE_URL + "/public/" + EMPRESA_SLUG + "/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: rawText.slice(0, 120) || "Lead via assistente virtual",
            mensagem: "Lead capturado via assistente de IA da landing page.",
          }),
        });
      } catch (error) {
        // Falha silenciosa: não deve travar a experiência de chat do cliente.
        console.warn("Não foi possível registrar lead via IA:", error);
      }
    }

    fab.addEventListener("click", function () {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) {
        startConversation();
        input.focus();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        panel.classList.remove("open");
      });
    }

    function trySend() {
      const value = input.value.trim();
      if (!value) return;
      handleUserMessage(value);
      input.value = "";
    }

    if (sendBtn) sendBtn.addEventListener("click", trySend);
    if (input) {
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          trySend();
        }
      });
    }
  });
})();
