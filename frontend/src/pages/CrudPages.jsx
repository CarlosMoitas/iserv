import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Link2,
  Package,
  Scissors,
  Users,
} from "lucide-react";
import { api } from "../services/api";
import { ResourceList } from "../components/ResourceList";
import { Avatar, Badge, Button, Card, Input, Textarea } from "../components/ui";

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-label="Fechar" />
      <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-display font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">✕</Button>
        </div>
        <div className="p-5">{children}</div>
      </Card>
    </div>
  );
}

export function ResourceForm({ endpoint, fields, defaultValues, onSuccess, onClose }) {
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({ defaultValues });

  useEffect(() => { reset(defaultValues); }, [defaultValues]);

  function applyTransforms(values) {
    const next = { ...values };
    for (const field of fields) {
      if (!field?.name) continue;
      if (typeof field.transformOut === "function") {
        next[field.name] = field.transformOut(next[field.name], next);
      }
    }
    return next;
  }

  async function onSubmit(data) {
    setServerError("");
    try {
      const payload = applyTransforms(data);
      if (defaultValues?.id) {
        await api.put(`${endpoint}/${defaultValues.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      setServerError(error.response?.data?.error || "Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((field) => {
        if (field.type === "textarea") {
          return <Textarea key={field.name} label={field.label} placeholder={field.placeholder} error={errors[field.name]?.message} {...register(field.name, field.rules)} />;
        }
        if (field.type === "select") {
          return (
            <label key={field.name} className="block space-y-2">
              <span className="text-sm font-medium">{field.label}</span>
              <select className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" {...register(field.name, field.rules)}>
                {field.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {errors[field.name] && <span className="block text-xs text-rose-500">{errors[field.name].message}</span>}
            </label>
          );
        }
        return <Input key={field.name} label={field.label} type={field.type || "text"} placeholder={field.placeholder} step={field.step} error={errors[field.name]?.message} {...register(field.name, field.rules)} />;
      })}
      {serverError && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{serverError}</div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : defaultValues?.id ? "Salvar alterações" : "Criar registro"}
        </Button>
      </div>
    </form>
  );
}

export function statusBadge(status, map) {
  const entry = map[status];
  if (!entry) return <Badge>{status}</Badge>;
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

const clienteStatusMap = { ATIVO: { label: "Ativo", tone: "success" }, INATIVO: { label: "Inativo", tone: "neutral" } };
const ordemStatusMap = { ABERTA: { label: "Aberta", tone: "warning" }, EM_ANDAMENTO: { label: "Em andamento", tone: "primary" }, CONCLUIDA: { label: "Concluída", tone: "success" }, CANCELADA: { label: "Cancelada", tone: "danger" } };
const orcamentoStatusMap = { RASCUNHO: { label: "Rascunho", tone: "neutral" }, ENVIADO: { label: "Enviado", tone: "primary" }, APROVADO: { label: "Aprovado", tone: "success" }, RECUSADO: { label: "Recusado", tone: "danger" }, EXPIRADO: { label: "Expirado", tone: "warning" } };
const agendamentoStatusMap = { AGENDADO: { label: "Agendado", tone: "neutral" }, CONFIRMADO: { label: "Confirmado", tone: "primary" }, CONCLUIDO: { label: "Concluído", tone: "success" }, CANCELADO: { label: "Cancelado", tone: "danger" } };
const pagamentoStatusMap = { PENDENTE: { label: "Pendente", tone: "warning" }, PAGO: { label: "Pago", tone: "success" }, CANCELADO: { label: "Cancelado", tone: "danger" } };

export function IntegracoesPage() {
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo" },
    { key: "ativo", label: "Ativo", render: (item) => <Badge tone={item.ativo ? "success" : "neutral"}>{item.ativo ? "Ativo" : "Inativo"}</Badge> },
    { key: "createdAt", label: "Criado em", render: (item) => formatDate(item.createdAt) },
  ];

  const fields = [
    { name: "tipo", label: "Tipo", rules: { required: "Obrigatório." }, placeholder: "WHATSAPP" },
    { name: "nome", label: "Nome", rules: { required: "Obrigatório." }, placeholder: "WhatsApp - Soma Contabilidade" },
    {
      name: "ativo",
      label: "Ativo",
      type: "select",
      options: [{ value: "true", label: "Ativo" }, { value: "false", label: "Inativo" }],
      transformOut: (v) => v === true || v === "true",
    },
    {
      name: "configuracao",
      label: "Configuração (JSON)",
      type: "textarea",
      placeholder:
        '{\n  "phoneNumberId": "....",\n  "verifyToken": "....",\n  "accessToken": "....",\n  "ai": { "enabled": true, "openaiApiKey": "....", "model": "gpt-4o-mini" }\n}',
      transformOut: (v) => {
        if (v && typeof v === "string") return JSON.parse(v);
        return v || {};
      },
    },
  ];

  function toFormModel(item) {
    if (!item) return item;
    const configuracaoText =
      item.configuracao && typeof item.configuracao === "object"
        ? JSON.stringify(item.configuracao, null, 2)
        : item.configuracao || "";
    return {
      ...item,
      ativo: item.ativo ? "true" : "false",
      configuracao: configuracaoText,
    };
  }

  return (
    <>
      <ResourceList
        key={refreshKey}
        endpoint="/integracoes"
        title="Integrações"
        newLabel="Nova integração"
        emptyLabel="Nenhuma integração cadastrada."
        emptyIcon={Link2}
        columns={columns}
        onNew={() => setModal(toFormModel({ tipo: "WHATSAPP", nome: "WhatsApp - ", ativo: true, configuracao: { ai: { enabled: false } } }))}
        onEdit={(item) => setModal(toFormModel(item))}
      />
      {modal !== null && (
        <Modal title={modal.id ? "Editar integração" : "Nova integração"} onClose={() => setModal(null)}>
          <ResourceForm endpoint="/integracoes" fields={fields} defaultValues={modal} onSuccess={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

export function ClientesPage() {
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    {
      key: "nome", label: "Cliente",
      render: (item) => (
        <div className="flex items-center gap-3">
          <Avatar name={item.nome} className="h-8 w-8 rounded-lg text-xs" />
          <div><p className="font-semibold">{item.nome}</p><p className="text-xs text-muted-foreground">{item.email || "—"}</p></div>
        </div>
      ),
    },
    { key: "telefone", label: "Telefone" },
    { key: "status", label: "Status", render: (item) => statusBadge(item.status, clienteStatusMap) },
    { key: "createdAt", label: "Criado em", render: (item) => formatDate(item.createdAt) },
  ];

  const fields = [
    { name: "nome", label: "Nome", rules: { required: "Obrigatório." } },
    { name: "email", label: "E-mail", type: "email" },
    { name: "telefone", label: "Telefone" },
    { name: "documento", label: "CPF / CNPJ" },
    { name: "observacoes", label: "Observações", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: [{ value: "ATIVO", label: "Ativo" }, { value: "INATIVO", label: "Inativo" }] },
  ];

  return (
    <>
      <ResourceList key={refreshKey} endpoint="/clientes" title="Clientes" newLabel="Novo cliente" emptyLabel="Nenhum cliente cadastrado." emptyIcon={Users} columns={columns} onNew={() => setModal({})} onEdit={(item) => setModal(item)} />
      {modal !== null && (
        <Modal title={modal.id ? "Editar cliente" : "Novo cliente"} onClose={() => setModal(null)}>
          <ResourceForm endpoint="/clientes" fields={fields} defaultValues={modal} onSuccess={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

export function OrdensServicoPage() {
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    { key: "numero", label: "#", render: (item) => <span className="font-mono text-xs font-semibold text-muted-foreground">#{String(item.numero).padStart(4, "0")}</span> },
    { key: "titulo", label: "Título", render: (item) => <div><p className="font-semibold">{item.titulo}</p><p className="text-xs text-muted-foreground">{item.cliente?.nome}</p></div> },
    { key: "status", label: "Status", render: (item) => statusBadge(item.status, ordemStatusMap) },
    { key: "valorTotal", label: "Valor", render: (item) => <span className="font-semibold">{formatCurrency(item.valorTotal)}</span> },
    { key: "createdAt", label: "Criado em", render: (item) => formatDate(item.createdAt) },
  ];

  const fields = [
    { name: "numero", label: "Número da OS", type: "number", rules: { required: "Obrigatório." } },
    { name: "clienteId", label: "ID do cliente", rules: { required: "Obrigatório." } },
    { name: "titulo", label: "Título", rules: { required: "Obrigatório." } },
    { name: "descricao", label: "Descrição", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: [{ value: "ABERTA", label: "Aberta" }, { value: "EM_ANDAMENTO", label: "Em andamento" }, { value: "CONCLUIDA", label: "Concluída" }, { value: "CANCELADA", label: "Cancelada" }] },
    { name: "valorTotal", label: "Valor total (R$)", type: "number", step: "0.01" },
  ];

  return (
    <>
      <ResourceList key={refreshKey} endpoint="/ordens-servico" title="Ordens de Serviço" newLabel="Nova OS" emptyLabel="Nenhuma OS cadastrada." emptyIcon={ClipboardList} columns={columns} onNew={() => setModal({})} onEdit={(item) => setModal(item)} />
      {modal !== null && (
        <Modal title={modal.id ? "Editar OS" : "Nova OS"} onClose={() => setModal(null)}>
          <ResourceForm endpoint="/ordens-servico" fields={fields} defaultValues={modal} onSuccess={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

export function OrcamentosPage() {
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    { key: "numero", label: "#", render: (item) => <span className="font-mono text-xs font-semibold text-muted-foreground">#{String(item.numero).padStart(4, "0")}</span> },
    { key: "cliente", label: "Cliente", render: (item) => item.cliente?.nome || "—" },
    { key: "status", label: "Status", render: (item) => statusBadge(item.status, orcamentoStatusMap) },
    { key: "valorTotal", label: "Valor", render: (item) => <span className="font-semibold">{formatCurrency(item.valorTotal)}</span> },
    { key: "validade", label: "Validade", render: (item) => formatDate(item.validade) },
  ];

  const fields = [
    { name: "numero", label: "Número", type: "number", rules: { required: "Obrigatório." } },
    { name: "clienteId", label: "ID do cliente", rules: { required: "Obrigatório." } },
    { name: "validade", label: "Validade", type: "date" },
    { name: "observacoes", label: "Observações", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: [{ value: "RASCUNHO", label: "Rascunho" }, { value: "ENVIADO", label: "Enviado" }, { value: "APROVADO", label: "Aprovado" }, { value: "RECUSADO", label: "Recusado" }, { value: "EXPIRADO", label: "Expirado" }] },
    { name: "valorTotal", label: "Valor total (R$)", type: "number", step: "0.01" },
  ];

  return (
    <>
      <ResourceList key={refreshKey} endpoint="/orcamentos" title="Orçamentos" newLabel="Novo orçamento" emptyLabel="Nenhum orçamento cadastrado." emptyIcon={Scissors} columns={columns} onNew={() => setModal({})} onEdit={(item) => setModal(item)} />
      {modal !== null && (
        <Modal title={modal.id ? "Editar orçamento" : "Novo orçamento"} onClose={() => setModal(null)}>
          <ResourceForm endpoint="/orcamentos" fields={fields} defaultValues={modal} onSuccess={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

export function AgendaPage() {
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    { key: "titulo", label: "Evento", render: (item) => <div><p className="font-semibold">{item.titulo}</p><p className="text-xs text-muted-foreground">{item.cliente?.nome}</p></div> },
    { key: "inicio", label: "Início", render: (item) => formatDate(item.inicio) },
    { key: "status", label: "Status", render: (item) => statusBadge(item.status, agendamentoStatusMap) },
    { key: "servico", label: "Serviço", render: (item) => item.servico?.nome || "—" },
  ];

  const fields = [
    { name: "clienteId", label: "ID do cliente", rules: { required: "Obrigatório." } },
    { name: "titulo", label: "Título", rules: { required: "Obrigatório." } },
    { name: "inicio", label: "Início", type: "datetime-local", rules: { required: "Obrigatório." } },
    { name: "fim", label: "Fim", type: "datetime-local", rules: { required: "Obrigatório." } },
    { name: "observacoes", label: "Observações", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: [{ value: "AGENDADO", label: "Agendado" }, { value: "CONFIRMADO", label: "Confirmado" }, { value: "CONCLUIDO", label: "Concluído" }, { value: "CANCELADO", label: "Cancelado" }] },
  ];

  return (
    <>
      <ResourceList key={refreshKey} endpoint="/agendamentos" title="Agenda" newLabel="Novo agendamento" emptyLabel="Nenhum agendamento cadastrado." emptyIcon={CalendarDays} columns={columns} onNew={() => setModal({})} onEdit={(item) => setModal(item)} />
      {modal !== null && (
        <Modal title={modal.id ? "Editar agendamento" : "Novo agendamento"} onClose={() => setModal(null)}>
          <ResourceForm endpoint="/agendamentos" fields={fields} defaultValues={modal} onSuccess={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

export function ProdutosPage() {
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    { key: "nome", label: "Produto", render: (item) => <div><p className="font-semibold">{item.nome}</p><p className="text-xs text-muted-foreground">{item.sku || "—"}</p></div> },
    { key: "estoque", label: "Estoque", render: (item) => <span className={Number(item.estoque) <= Number(item.estoqueMin) ? "font-semibold text-amber-600" : ""}>{Number(item.estoque)}</span> },
    { key: "precoVenda", label: "Preço", render: (item) => formatCurrency(item.precoVenda) },
    { key: "ativo", label: "Status", render: (item) => <Badge tone={item.ativo ? "success" : "neutral"}>{item.ativo ? "Ativo" : "Inativo"}</Badge> },
  ];

  const fields = [
    { name: "nome", label: "Nome", rules: { required: "Obrigatório." } },
    { name: "sku", label: "SKU" },
    { name: "descricao", label: "Descrição", type: "textarea" },
    { name: "precoVenda", label: "Preço de venda (R$)", type: "number", step: "0.01", rules: { required: "Obrigatório." } },
    { name: "custo", label: "Custo (R$)", type: "number", step: "0.01" },
    { name: "estoque", label: "Estoque atual", type: "number", step: "0.001" },
    { name: "estoqueMin", label: "Estoque mínimo", type: "number", step: "0.001" },
    { name: "ativo", label: "Status", type: "select", options: [{ value: "true", label: "Ativo" }, { value: "false", label: "Inativo" }] },
  ];

  return (
    <>
      <ResourceList key={refreshKey} endpoint="/produtos" title="Produtos" newLabel="Novo produto" emptyLabel="Nenhum produto cadastrado." emptyIcon={Package} columns={columns} onNew={() => setModal({})} onEdit={(item) => setModal(item)} />
      {modal !== null && (
        <Modal title={modal.id ? "Editar produto" : "Novo produto"} onClose={() => setModal(null)}>
          <ResourceForm endpoint="/produtos" fields={fields} defaultValues={modal} onSuccess={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

export function FinanceiroPage() {
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    { key: "descricao", label: "Descrição", render: (item) => <div><p className="font-semibold">{item.descricao}</p><p className="text-xs text-muted-foreground">{item.cliente?.nome || "—"}</p></div> },
    { key: "tipo", label: "Tipo", render: (item) => <Badge tone={item.tipo === "ENTRADA" ? "success" : "danger"}>{item.tipo === "ENTRADA" ? "Entrada" : "Saída"}</Badge> },
    { key: "valor", label: "Valor", render: (item) => <span className={`font-semibold ${item.tipo === "ENTRADA" ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(item.valor)}</span> },
    { key: "status", label: "Status", render: (item) => statusBadge(item.status, pagamentoStatusMap) },
    { key: "vencimento", label: "Vencimento", render: (item) => formatDate(item.vencimento) },
  ];

  const fields = [
    { name: "descricao", label: "Descrição", rules: { required: "Obrigatório." } },
    { name: "tipo", label: "Tipo", type: "select", options: [{ value: "ENTRADA", label: "Entrada" }, { value: "SAIDA", label: "Saída" }], rules: { required: "Obrigatório." } },
    { name: "valor", label: "Valor (R$)", type: "number", step: "0.01", rules: { required: "Obrigatório." } },
    { name: "status", label: "Status", type: "select", options: [{ value: "PENDENTE", label: "Pendente" }, { value: "PAGO", label: "Pago" }, { value: "CANCELADO", label: "Cancelado" }] },
    { name: "vencimento", label: "Vencimento", type: "date" },
    { name: "dataPagamento", label: "Data do pagamento", type: "date" },
    { name: "clienteId", label: "ID do cliente (opcional)" },
  ];

  return (
    <>
      <ResourceList key={refreshKey} endpoint="/pagamentos" title="Financeiro" newLabel="Novo lançamento" emptyLabel="Nenhum lançamento cadastrado." emptyIcon={CircleDollarSign} columns={columns} onNew={() => setModal({})} onEdit={(item) => setModal(item)} />
      {modal !== null && (
        <Modal title={modal.id ? "Editar lançamento" : "Novo lançamento"} onClose={() => setModal(null)}>
          <ResourceForm endpoint="/pagamentos" fields={fields} defaultValues={modal} onSuccess={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

export function PlaceholderPage({ title, description }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-3 text-muted-foreground">
      <p className="font-display text-2xl font-bold text-foreground">{title}</p>
      <p className="text-sm">{description || "Esta seção estará disponível em breve."}</p>
    </div>
  );
}
