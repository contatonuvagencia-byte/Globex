"use client";
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AREAS, PERFIS, type Area, type Nivel, type Permissoes } from "@/lib/permissoes";

type Pessoa = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  permissoes: Partial<Permissoes>;
  clientes: string[];
  ativo: boolean;
  ultimo_acesso: string | null;
  foto?: string | null;
};

const NIVEIS: { v: Nivel; r: string }[] = [
  { v: "nenhum", r: "Sem acesso" },
  { v: "ver", r: "Só ver" },
  { v: "editar", r: "Editar" },
];


export default function Equipe() {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [clientes, setClientes] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<Pessoa | "nova" | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/usuarios");
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro ao carregar");
    setPessoas(j.usuarios);
  }, []);
  useEffect(() => {
    carregar();
    fetch("/api/calendarios")
      .then((r) => r.json())
      .then((j) => setClientes([...new Set<string>((j.calendarios ?? []).filter((c: { ativo: boolean }) => c.ativo).map((c: { nome: string }) => c.nome))]))
      .catch(() => {});
  }, [carregar]);

  async function enviar(corpo: unknown) {
    const r = await fetch("/api/usuarios", { method: "POST", body: JSON.stringify(corpo) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro ?? "Erro ao salvar");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium text-ink-2">Acessos</p>
          <h1 className="titulo-pagina">Equipe</h1>
          <p className="mt-1 text-sm text-ink-2">Cada pessoa entra com o próprio e-mail e senha e só vê o que o perfil dela permite.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditando("nova")}><Plus size={16} /> Adicionar pessoa</button>
      </header>

      {erro && <p className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}
      {aviso && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-azul-claro px-4 py-3 text-sm font-semibold text-azul-escuro">
          {aviso}<button className="ml-auto" onClick={() => setAviso("")} aria-label="Fechar">×</button>
        </p>
      )}

      <section className="card mb-4 flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-sm font-bold text-white">ADM</span>
        <div>
          <p className="font-bold">Administração (você)</p>
          <p className="text-sm text-ink-2">Entra com o e-mail em branco e a senha APP_PASSWORD. Acesso a tudo, incluindo Financeiro e Equipe.</p>
        </div>
      </section>

      {!pessoas && !erro && <p className="text-sm text-ink-2">Carregando...</p>}
      {pessoas && pessoas.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold">Ainda não tem ninguém da equipe.</p>
          <p className="mt-1 text-sm text-ink-2">Clique em “Adicionar pessoa”, escolha um perfil e mande o e-mail e a senha para ela.</p>
        </div>
      )}

      <ul className="space-y-3">
        {pessoas?.map((p) => (
          <li key={p.id} className={`card flex flex-wrap items-center gap-4 p-5 ${p.ativo ? "" : "opacity-60"}`}>
            <Avatar nome={p.nome} foto={p.foto} tamanho={44} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{p.nome} {!p.ativo && <span className="chip ml-1 bg-surface-2 text-ink-2">desativado</span>}</p>
              <p className="text-sm text-ink-2">{p.email}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="chip bg-ink text-white">{PERFIS[p.papel]?.nome ?? p.papel}</span>
                {p.papel !== "admin" &&
                  (Object.keys(AREAS) as Area[])
                    .filter((a) => (p.permissoes?.[a] ?? "nenhum") !== "nenhum")
                    .map((a) => (
                      <span key={a} className="chip bg-azul-claro text-azul-escuro">
                        {AREAS[a]} · {p.permissoes[a] === "editar" ? "edita" : "vê"}
                      </span>
                    ))}
                {p.clientes.length > 0 && <span className="chip bg-surface-2 text-ink-2">Só: {p.clientes.join(", ")}</span>}
              </div>
            </div>
            <p className="text-xs text-ink-3">{p.ultimo_acesso ? `Último acesso ${new Date(p.ultimo_acesso).toLocaleDateString("pt-BR")}` : "Nunca entrou"}</p>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 hover:bg-azul-claro" onClick={() => setEditando(p)} aria-label={`Editar ${p.nome}`}>
              <Pencil size={15} />
            </button>
          </li>
        ))}
      </ul>

      {editando && (
        <Formulario
          pessoa={editando === "nova" ? null : editando}
          clientes={clientes}
          onFechar={() => setEditando(null)}
          onSalvar={async (corpo, msg) => {
            try {
              await enviar(corpo);
              setEditando(null);
              setAviso(msg);
              await carregar();
            } catch (e) {
              return (e as Error).message;
            }
          }}
        />
      )}
    </div>
  );
}

function Formulario({ pessoa, clientes, onFechar, onSalvar }: {
  pessoa: Pessoa | null;
  clientes: string[];
  onFechar: () => void;
  onSalvar: (corpo: unknown, msg: string) => Promise<string | undefined>;
}) {
  const [nome, setNome] = useState(pessoa?.nome ?? "");
  const [email, setEmail] = useState(pessoa?.email ?? "");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [papel, setPapel] = useState(pessoa?.papel ?? "social");
  const [perms, setPerms] = useState<Permissoes>({ ...PERFIS.personalizado.permissoes, ...(pessoa?.permissoes ?? PERFIS.social.permissoes) } as Permissoes);
  const [selClientes, setSelClientes] = useState<string[]>(pessoa?.clientes ?? []);
  const [ativo, setAtivo] = useState(pessoa?.ativo ?? true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function escolherPerfil(p: string) {
    setPapel(p);
    if (p !== "personalizado") setPerms({ ...PERFIS[p].permissoes });
  }
  function gerarSenha() {
    const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const v = new Uint32Array(12);
    crypto.getRandomValues(v);
    setSenha(Array.from(v, (n) => letras[n % letras.length]).join(""));
    setVerSenha(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const dados = { nome, email, senha: senha || undefined, papel, permissoes: perms, clientes: papel === "admin" ? [] : selClientes, ativo };
    const msg = pessoa
      ? `${nome} atualizado.${senha ? " A senha nova já vale." : ""}`
      : `${nome} adicionado. Mande para a pessoa: endereço do painel, e-mail ${email} e a senha que você definiu.`;
    const r = await onSalvar(pessoa ? { acao: "atualizar", id: pessoa.id, dados } : { acao: "criar", dados }, msg);
    if (r) setErro(r);
    setSalvando(false);
  }

  const campo = "block text-xs font-semibold text-ink-2";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFechar}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-creme shadow-xl" role="dialog" aria-modal="true">
        <header className="flex items-center gap-3 bg-ink px-6 py-5 text-white">
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/60">{pessoa ? "Editar acesso" : "Nova pessoa na equipe"}</p>
            <h2 className="text-xl font-bold">{nome || "Sem nome"}</h2>
          </div>
          <button type="button" onClick={onFechar} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fechar"><X size={16} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {erro && <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}

          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <label className={campo}>Nome<input className="input mt-1" value={nome} onChange={(e) => setNome(e.target.value)} required /></label>
            <label className={campo}>E-mail (é o login)<input type="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className={`${campo} sm:col-span-2`}>
              {pessoa ? "Nova senha (deixe em branco para manter)" : "Senha (mínimo 8 caracteres)"}
              <div className="mt-1 flex gap-2">
                <div className="relative flex-1">
                  <input type={verSenha ? "text" : "password"} className="input pr-10 font-mono" value={senha} onChange={(e) => setSenha(e.target.value)} required={!pessoa} minLength={senha || !pessoa ? 8 : undefined} autoComplete="new-password" />
                  <button type="button" onClick={() => setVerSenha((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2" aria-label="Mostrar senha">
                    {verSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button type="button" className="btn-ghost" onClick={gerarSenha}>Gerar</button>
              </div>
            </label>
            {pessoa && (
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                Acesso ativo (desmarque para bloquear sem apagar)
              </label>
            )}
          </section>

          <section className="card p-4">
            <p className="text-sm font-bold">Perfil</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(PERFIS).map(([k, p]) => (
                <button type="button" key={k} onClick={() => escolherPerfil(k)} className={`rounded-2xl p-3 text-left transition ${papel === k ? "bg-azul text-white" : "bg-surface hover:bg-azul-claro"}`}>
                  <p className="text-sm font-bold">{p.nome}</p>
                  <p className={`text-xs ${papel === k ? "text-white/75" : "text-ink-2"}`}>{p.descricao}</p>
                </button>
              ))}
            </div>
          </section>

          {papel !== "admin" && (
            <section className="card p-4">
              <p className="text-sm font-bold">O que pode em cada área</p>
              <p className="text-xs text-ink-2">{papel === "personalizado" ? "Escolha área por área." : "Mexer aqui transforma o perfil em “Personalizado”."}</p>
              <ul className="mt-3 space-y-2">
                {(Object.keys(AREAS) as Area[]).map((a) => (
                  <li key={a} className="flex flex-wrap items-center gap-2">
                    <span className="w-32 text-sm font-semibold">{AREAS[a]}</span>
                    <div className="pill-tabs bg-surface">
                      {NIVEIS.map((n) => (
                        <button
                          type="button"
                          key={n.v}
                          onClick={() => {
                            setPerms((p) => ({ ...p, [a]: n.v }));
                            setPapel("personalizado");
                          }}
                          className={`pill-tab py-1 text-xs ${perms[a] === n.v ? "pill-tab-ativo" : ""}`}
                        >
                          {n.r}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {papel !== "admin" && (
            <section className="card p-4">
              <p className="text-sm font-bold">Clientes que pode ver</p>
              <p className="text-xs text-ink-2">Vale para Calendário, Demandas e Métricas. Nenhum marcado = todos os clientes.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {clientes.map((c) => {
                  const on = selClientes.includes(c);
                  return (
                    <button type="button" key={c} onClick={() => setSelClientes((l) => (on ? l.filter((x) => x !== c) : [...l, c]))} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${on ? "bg-ink text-white" : "bg-surface text-ink-2"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-black/5 bg-white px-6 py-4">
          {pessoa && (
            <button
              type="button"
              className="btn-ghost text-[#b42318]"
              onClick={async () => {
                if (!confirm(`Remover ${pessoa.nome} da equipe? Ela perde o acesso na hora.`)) return;
                const r = await onSalvar({ acao: "excluir", id: pessoa.id }, `${pessoa.nome} removido da equipe.`);
                if (r) setErro(r);
              }}
            >
              <Trash2 size={15} /> Remover
            </button>
          )}
          <button type="button" onClick={onFechar} className="btn-ghost ml-auto">Cancelar</button>
          <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando..." : pessoa ? "Salvar" : "Adicionar"}</button>
        </footer>
      </form>
    </div>
  );
}
