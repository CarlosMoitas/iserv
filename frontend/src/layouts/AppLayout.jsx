import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Command,
  LayoutDashboard,
  Link2,
  Menu,
  Moon,
  Package,
  Scissors,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Avatar, Button } from "../components/ui";

const navigation = [
  { label: "Visão geral", to: "/", icon: LayoutDashboard },
  { label: "Clientes", to: "/clientes", icon: Users },
  { label: "Agenda", to: "/agenda", icon: CalendarDays },
  { label: "Ordens de serviço", to: "/ordens-servico", icon: ClipboardList },
  { label: "Orçamentos", to: "/orcamentos", icon: Scissors },
  { label: "Financeiro", to: "/financeiro", icon: CircleDollarSign },
  { label: "Produtos", to: "/produtos", icon: Package },
  { label: "Relatórios", to: "/relatorios", icon: BarChart3 },
  { label: "Integrações", to: "/integracoes", icon: Link2 },
  { label: "Configurações", to: "/configuracoes", icon: Settings },
];

function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25">
        <Command size={20} strokeWidth={2.5} />
      </span>
      {!compact ? (
        <span className="font-display text-xl font-bold tracking-tight">
          i<span className="text-primary">Serv</span>
        </span>
      ) : null}
    </div>
  );
}

function SidebarContent({ collapsed, onNavigate }) {
  const { user } = useAuth();

  return (
    <>
      <div
        className={`flex h-20 items-center border-b border-border px-5 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Logo compact={collapsed} />
        {!collapsed ? (
          <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            SaaS
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6">
        {!collapsed ? (
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </p>
        ) : null}
        <nav className="space-y-1">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {!collapsed ? <span>{label}</span> : null}
            </NavLink>
          ))}
        </nav>
      </div>

      {!collapsed ? (
        <div className="border-t border-border p-4">
          <div className="rounded-2xl bg-muted/70 p-3">
            <p className="truncate text-xs font-semibold">{user?.empresa?.nome}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Plano {user?.empresa?.plano || "Starter"}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:translate-x-0 ${
          collapsed ? "lg:w-[84px]" : ""
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent
          collapsed={collapsed}
          onNavigate={() => setSidebarOpen(false)}
        />
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute -right-3 top-24 hidden h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <div
        className={`min-h-screen transition-[padding] duration-300 ${
          collapsed ? "lg:pl-[84px]" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/85 px-3 backdrop-blur-xl sm:h-20 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </Button>
            <div className="hidden sm:block">
              <p className="font-display text-sm font-semibold">Olá, {user?.nome?.split(" ")[0] || "profissional"} 👋</p>
              <p className="text-xs text-muted-foreground">
                Aqui está o resumo da sua operação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <button
              type="button"
              onClick={logout}
              className="group flex items-center gap-2 rounded-xl p-1.5 pr-2 text-left hover:bg-muted"
              title="Sair"
            >
              <Avatar name={user?.nome} className="h-9 w-9 rounded-lg text-xs" />
              <span className="hidden max-w-32 truncate text-xs font-semibold sm:block">
                {user?.nome}
              </span>
            </button>
          </div>
        </header>

        <main className="page-shell">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed right-4 top-6 z-50 rounded-lg bg-card p-2 text-muted-foreground lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      ) : null}
    </div>
  );
}
