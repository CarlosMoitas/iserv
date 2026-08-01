import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Users,
} from "lucide-react";
import { api } from "../services/api";
import { Avatar, Badge, Card, Spinner } from "../components/ui";

function MetricCard({ label, value, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };

  return (
    <Card className="flex items-center gap-5 p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-bold leading-none">{value}</p>
      </div>
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = {
    AGENDADO: { label: "Agendado", tone: "neutral" },
    CONFIRMADO: { label: "Confirmado", tone: "primary" },
    CONCLUIDO: { label: "Concluído", tone: "success" },
    CANCELADO: { label: "Cancelado", tone: "danger" },
  };
  const item = map[status] || { label: status, tone: "neutral" };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await api.get("/dashboard");
        setData(response.data);
      } catch {
        setError("Não foi possível carregar o dashboard. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-600 dark:text-rose-400">
        {error}
      </div>
    );
  }

  const { metrics, agendaDoDia, clientesRecentes } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Clientes ativos"
          value={metrics.clientes}
          icon={Users}
          tone="primary"
        />
        <MetricCard
          label="Ordens abertas"
          value={metrics.ordensAbertas}
          icon={Clock}
          tone="warning"
        />
        <MetricCard
          label="Ordens concluídas"
          value={metrics.ordensConcluidas}
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          label="Receita do mês"
          value={formatCurrency(metrics.receitaMes)}
          icon={CircleDollarSign}
          tone="purple"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="flex items-center gap-3 border-b border-border p-5">
            <CalendarDays size={18} className="text-muted-foreground" />
            <h2 className="font-semibold">Agenda de hoje</h2>
            <Badge tone="primary" className="ml-auto">
              {agendaDoDia.length} agendamento{agendaDoDia.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {agendaDoDia.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <CalendarDays size={40} strokeWidth={1.2} />
              <p className="text-sm">Nenhum agendamento para hoje.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {agendaDoDia.map((item) => (
                <li key={item.id} className="flex items-start gap-4 p-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="text-xs font-bold leading-none">
                      {formatTime(item.inicio)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.cliente?.nome}
                      {item.servico ? ` · ${item.servico.nome}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3 border-b border-border p-5">
            <Users size={18} className="text-muted-foreground" />
            <h2 className="font-semibold">Últimos clientes</h2>
          </div>
          {clientesRecentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Users size={36} strokeWidth={1.2} />
              <p className="text-sm">Nenhum cliente cadastrado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {clientesRecentes.map((cliente) => (
                <li key={cliente.id} className="flex items-center gap-3 p-4">
                  <Avatar name={cliente.nome} className="h-9 w-9 rounded-lg text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{cliente.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {cliente.email || cliente.telefone || "Sem contato"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(cliente.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
