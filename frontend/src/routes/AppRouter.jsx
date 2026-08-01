import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "../pages/AuthPages";
import { DashboardPage } from "../pages/DashboardPage";
import {
  AgendaPage,
  ClientesPage,
  FinanceiroPage,
  OrcamentosPage,
  OrdensServicoPage,
  PlaceholderPage,
  ProdutosPage,
} from "../pages/CrudPages";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="ordens-servico" element={<OrdensServicoPage />} />
        <Route path="orcamentos" element={<OrcamentosPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="produtos" element={<ProdutosPage />} />
        <Route path="relatorios" element={<PlaceholderPage title="Relatórios" description="Análises e exportações de dados estarão disponíveis em breve." />} />
        <Route path="configuracoes" element={<PlaceholderPage title="Configurações" description="Personalize sua conta e empresa nesta seção." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
