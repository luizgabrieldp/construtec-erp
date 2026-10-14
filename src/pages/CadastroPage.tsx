import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, HardHat, Lock, User, ArrowRight, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button, Input, Field, Badge } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { toast } from '@/components/ui/Toast';

export function CadastroPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { validarConvite, cadastrarComConvite, usuarioAtual } = useAuth();

  const conviteQuery = searchParams.get('convite') || '';
  const [codigo, setCodigo] = useState(conviteQuery);
  const [conviteVerificado, setConviteVerificado] = useState(() =>
    conviteQuery ? validarConvite(conviteQuery) : null
  );

  const [nome, setNome] = useState('');
  const [emailOuLogin, setEmailOuLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Se já houver convite na URL ao carregar, valida imediatamente
  useEffect(() => {
    if (conviteQuery) {
      const c = validarConvite(conviteQuery);
      setConviteVerificado(c);
      if (!c) {
        setErro('O código de convite informado na URL é inválido ou já foi utilizado.');
      } else {
        setErro(null);
      }
    }
  }, [conviteQuery, validarConvite]);

  const handleValidarCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const c = validarConvite(codigo);
    if (!c) {
      setErro('Código de convite não encontrado ou já expirado/utilizado.');
      setConviteVerificado(null);
    } else {
      setConviteVerificado(c);
      setErro(null);
    }
  };

  const handleSubmitCadastro = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!conviteVerificado) {
      setErro('Valide o código de convite antes de continuar.');
      return;
    }

    if (!nome.trim() || !emailOuLogin.trim() || !senha.trim()) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas informadas não coincidem.');
      return;
    }

    if (senha.length < 4) {
      setErro('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    const resultado = cadastrarComConvite(conviteVerificado.codigo, {
      nome,
      emailOuLogin,
      senha,
    });

    if (resultado.ok) {
      setSucesso(true);
      toast('Cadastro concluído com sucesso! Bem-vindo à CONSTRUTEC.', 'success');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } else {
      setErro(resultado.error || 'Erro ao realizar cadastro.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl border border-line bg-surface/90 backdrop-blur-xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h1 className="text-xl font-bold text-fg tracking-tight">Ativar Convite de Acesso</h1>
            <p className="text-xs text-muted mt-1">
              Cadastre suas credenciais para acessar o ambiente corporativo
            </p>
          </div>

          {erro && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {sucesso ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
              <h2 className="text-base font-bold text-fg">Conta criada com sucesso!</h2>
              <p className="text-xs text-muted">Redirecionando para o sistema...</p>
            </div>
          ) : !conviteVerificado ? (
            /* Passo 1: Informar código do convite caso não validado */
            <form onSubmit={handleValidarCodigo} className="space-y-4">
              <Field label="Código do Convite">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted pointer-events-none" />
                  <Input
                    required
                    autoFocus
                    placeholder="Ex.: ADM-X8K9L2 ou OBRA2026"
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value.toUpperCase());
                      if (erro) setErro(null);
                    }}
                    className="pl-9 font-mono uppercase"
                  />
                </div>
              </Field>

              <Button type="submit" className="w-full" icon={<ArrowRight className="size-4" />}>
                Verificar Convite
              </Button>
            </form>
          ) : (
            /* Passo 2: Formulário de cadastro com o papel já fixado e não editável */
            <form onSubmit={handleSubmitCadastro} className="space-y-4">
              {/* Papel Atribuído (Fixo e Não Editável) */}
              <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">Nível de Acesso Atribuído:</span>
                  <div className="flex items-center gap-1.5">
                    {conviteVerificado.perfil === 'admin' ? (
                      <Badge tone="orange" className="gap-1 px-2.5 py-1 text-xs">
                        <ShieldCheck className="size-3.5" />
                        Administrador
                      </Badge>
                    ) : (
                      <Badge tone="amber" className="gap-1 px-2.5 py-1 text-xs">
                        <HardHat className="size-3.5" />
                        Encarregado da Obra
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-2">
                  Papel definido pelo convite ({conviteVerificado.codigo}). Não pode ser alterado pelo convidado.
                </p>
              </div>

              <Field label="Nome Completo">
                <Input
                  required
                  autoFocus
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </Field>

              <Field label="Login ou E-mail para Acesso">
                <Input
                  required
                  placeholder="login.usuario ou email@empresa.com"
                  value={emailOuLogin}
                  onChange={(e) => setEmailOuLogin(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Senha">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </Field>

                <Field label="Confirmar Senha">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </Field>
              </div>

              <Button type="submit" className="w-full mt-2" icon={<ArrowRight className="size-4" />}>
                Concluir Cadastro e Acessar
              </Button>
            </form>
          )}

          <div className="mt-6 text-center pt-4 border-t border-line">
            <Link to="/login" className="text-xs font-semibold text-muted hover:text-fg hover:underline">
              Já possui uma conta? Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
