import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { ShieldCheck, HardHat, Lock, User, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button, Input, Field } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { toast } from '@/components/ui/Toast';

export function LoginPage() {
  const navigate = useNavigate();
  const { usuarioAtual, login, loginRapido } = useAuth();

  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Se já estiver logado, redireciona para a raiz
  if (usuarioAtual) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!loginInput.trim() || !senhaInput.trim()) {
      setErro('Preencha seu login/e-mail e senha.');
      return;
    }

    setCarregando(true);
    const resultado = login(loginInput, senhaInput);
    setCarregando(false);

    if (resultado.ok) {
      toast('Login realizado com sucesso!', 'success');
      navigate('/');
    } else {
      setErro(resultado.error || 'Credenciais inválidas.');
    }
  };

  const handleDemo = (perfil: 'admin' | 'encarregado') => {
    loginRapido(perfil);
    toast(`Conectado como ${perfil === 'admin' ? 'Administrador' : 'Encarregado'}!`, 'success');
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg px-4 py-12 relative overflow-hidden">
      {/* Elementos visuais decorativos de fundo */}
      <div className="absolute -top-40 -right-40 size-96 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Principal */}
        <div className="rounded-3xl border border-line bg-surface/90 backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo e Cabeçalho */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-xl font-bold text-fg tracking-tight">Acesso ao Sistema</h1>
            <p className="text-xs text-muted mt-1">
              Gestão de Obras, Canteiro, Equipes & Financeiro
            </p>
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 animate-in fade-in">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Login ou E-mail">
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted pointer-events-none" />
                <Input
                  required
                  autoFocus
                  placeholder="Seu usuário ou e-mail"
                  value={loginInput}
                  onChange={(e) => {
                    setLoginInput(e.target.value);
                    if (erro) setErro(null);
                  }}
                  className="pl-9"
                />
              </div>
            </Field>

            <Field label="Senha">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted pointer-events-none" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={senhaInput}
                  onChange={(e) => {
                    setSenhaInput(e.target.value);
                    if (erro) setErro(null);
                  }}
                  className="pl-9"
                />
              </div>
            </Field>

            <Button
              type="submit"
              disabled={carregando}
              className="w-full mt-2"
              icon={<ArrowRight className="size-4" />}
            >
              {carregando ? 'Entrando...' : 'Entrar no Sistema'}
            </Button>
          </form>

          {/* Divisor */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <span className="relative bg-surface px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Ou acesse demonstração
            </span>
          </div>

          {/* Atalhos Rápidos para Demonstração */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleDemo('admin')}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface-2/60 hover:bg-surface-2 hover:border-brand/40 p-3 text-center transition-all cursor-pointer group"
            >
              <div className="grid size-8 place-items-center rounded-xl bg-brand/10 text-brand group-hover:scale-105 transition-transform">
                <ShieldCheck className="size-4" />
              </div>
              <span className="text-xs font-semibold text-fg">Administrador</span>
              <span className="text-[10px] text-muted">admin / admin123</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemo('encarregado')}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface-2/60 hover:bg-surface-2 hover:border-amber-500/40 p-3 text-center transition-all cursor-pointer group"
            >
              <div className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                <HardHat className="size-4" />
              </div>
              <span className="text-xs font-semibold text-fg">Encarregado</span>
              <span className="text-[10px] text-muted">encarregado / obra123</span>
            </button>
          </div>

          {/* Link para Ativação de Convite */}
          <div className="mt-8 text-center pt-4 border-t border-line">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <KeyRound className="size-3.5" />
              <span>Possui um código de convite? Ativar Acesso</span>
            </Link>
          </div>
        </div>

        {/* Rodapé institucional */}
        <p className="text-center text-[11px] text-muted/60 mt-6">
          CONSTRUTEC ERP © {new Date().getFullYear()} — Plataforma de Gestão da Construção Civil
        </p>
      </div>
    </div>
  );
}
