import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Command, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import { Button, Input } from "../components/ui";
import { api } from "../services/api";

const highlights = [
  "Organize clientes, agenda e ordens em um só lugar",
  "Ative apenas os módulos que sua operação precisa",
  "Tenha uma visão clara do crescimento do negócio",
];

function AuthShell({ title, description, children }) {
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <Link to="/login" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Command size={20} />
            </span>
            <span className="font-display text-xl font-bold">
              i<span className="text-indigo-300">Serv</span>
            </span>
          </Link>
          <div className="mt-32 max-w-lg">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Operação mais inteligente
            </p>
            <h1 className="font-display text-5xl font-bold leading-tight">
              Menos planilhas. Mais tempo para fazer seu negócio crescer.
            </h1>
            <div className="mt-10 space-y-4">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3 text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-indigo-300">
                    <Check size={13} />
                  </span>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">© 2026 iServ. Feito para serviços que fazem acontecer.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/login" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <Command size={20} />
              </span>
              <span className="font-display text-xl font-bold">
                i<span className="text-primary">Serv</span>
              </span>
            </Link>
          </div>
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function PasswordInput({ label, error, registration }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        label={label}
        error={error}
        type={visible ? "text" : "password"}
        {...registration}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400">
      {message}
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(data) {
    setServerError("");
    try {
      await login(data);
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(error.response?.data?.error || "Não foi possível entrar agora.");
    }
  }

  return (
    <AuthShell
      title="Bem-vindo de volta"
      description="Entre no workspace da sua empresa para continuar."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Slug da empresa"
          placeholder="minha-empresa"
          error={errors.empresaSlug?.message}
          {...register("empresaSlug", { required: "Informe o slug da empresa." })}
        />
        <Input
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register("email", { required: "Informe seu e-mail." })}
        />
        <PasswordInput
          label="Senha"
          error={errors.senha?.message}
          registration={register("senha", { required: "Informe sua senha." })}
        />
        <FormError message={serverError} />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Esqueci minha senha
          </Link>
          {" · "}
          <Link to="/register" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(data) {
    setServerError("");
    try {
      await registerAuth(data);
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(error.response?.data?.error || "Não foi possível criar a conta.");
    }
  }

  return (
    <AuthShell
      title="Crie sua conta"
      description="Configure o workspace da sua empresa em menos de 2 minutos."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Nome da empresa"
          placeholder="Barbearia do João"
          error={errors.empresaNome?.message}
          {...register("empresaNome", { required: "Informe o nome da empresa." })}
        />
        <Input
          label="Slug da empresa (identificador único)"
          placeholder="barbearia-joao"
          error={errors.empresaSlug?.message}
          {...register("empresaSlug", {
            required: "Informe o slug.",
            pattern: {
              value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: "Use apenas letras minúsculas, números e hífens.",
            },
          })}
        />
        <Input
          label="Seu nome"
          placeholder="João Silva"
          error={errors.nome?.message}
          {...register("nome", { required: "Informe seu nome." })}
        />
        <Input
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register("email", { required: "Informe seu e-mail." })}
        />
        <PasswordInput
          label="Senha (mín. 8 caracteres)"
          error={errors.senha?.message}
          registration={register("senha", {
            required: "Informe uma senha.",
            minLength: { value: 8, message: "A senha deve ter ao menos 8 caracteres." },
          })}
        />
        <FormError message={serverError} />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Criando conta…" : "Criar conta grátis"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(data) {
    setServerError("");
    try {
      await api.post("/auth/forgot-password", data);
      setSent(true);
    } catch (error) {
      setServerError(error.response?.data?.error || "Não foi possível processar a solicitação.");
    }
  }

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe seus dados e enviaremos as instruções de recuperação."
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-700 dark:text-emerald-400">
          <p className="font-semibold">Solicitação enviada!</p>
          <p className="mt-1 text-muted-foreground">
            Se os dados estiverem cadastrados, você receberá as instruções no e-mail.
          </p>
          <Link to="/login" className="mt-3 inline-block text-primary hover:underline">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Slug da empresa"
            placeholder="minha-empresa"
            error={errors.empresaSlug?.message}
            {...register("empresaSlug", { required: "Informe o slug da empresa." })}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="voce@email.com"
            error={errors.email?.message}
            {...register("email", { required: "Informe seu e-mail." })}
          />
          <FormError message={serverError} />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Enviando…" : "Enviar instruções"}
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              ← Voltar ao login
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
