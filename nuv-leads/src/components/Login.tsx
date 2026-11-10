import { useState } from "react";
import { supabase } from "../lib/supabase";
import { BigCloud } from "./Logo";

const ERRORS: Record<string, string> = {
  "email rate limit exceeded":
    "Limite de e-mails por hora atingido. Procure o último link na caixa de entrada (e no spam) ou tente de novo em 1 hora.",
  "Invalid login credentials": "E-mail ou senha incorretos. Se ainda não criou senha, entre pelo link por e-mail.",
};

export default function Login() {
  const [mode, setMode] = useState<"senha" | "link">("senha");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    const { error } =
      mode === "senha"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (error) setErr(ERRORS[error.message] ?? error.message);
    else if (mode === "link") setSent(true);
  }

  return (
    <div className="login">
      <div className="login-art">
        <div>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12 }}>Agência NUV · Prospecção</p>
          <h1>
            Hold the vision.
            <br />
            <span>Trust the process.</span>
          </h1>
        </div>
        <p className="login-tag">Leads qualificados, mensagens no tom da NUV e o funil inteiro num lugar só.</p>
        <BigCloud className="cloud" />
      </div>
      <div className="login-form">
        {sent ? (
          <div style={{ maxWidth: 360 }}>
            <h2>Confira seu e-mail</h2>
            <p className="muted">
              Enviamos um link de acesso para <b>{email}</b>. Abra no mesmo navegador. Pode cair no spam, com o assunto “Your Magic Link”.
            </p>
            <button className="btn" onClick={() => setSent(false)}>Voltar</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>Entrar</h2>
            <div className="seg" style={{ justifySelf: "start" }}>
              <button type="button" className={mode === "senha" ? "on" : ""} onClick={() => { setMode("senha"); setErr(""); }}>Com senha</button>
              <button type="button" className={mode === "link" ? "on" : ""} onClick={() => { setMode("link"); setErr(""); }}>Link por e-mail</button>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {mode === "senha"
                ? "Primeira vez? Entre pelo link por e-mail e crie sua senha no menu “Definir senha”."
                : "Você recebe um link de acesso por e-mail. Peça só uma vez: há limite de envios por hora."}
            </p>
            <div className="field">
              <label>E-mail</label>
              <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@nuv.com" />
            </div>
            {mode === "senha" && (
              <div className="field">
                <label>Senha</label>
                <input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            {err && <p style={{ color: "var(--danger)", margin: 0 }}>{err}</p>}
            <button className="btn primary" disabled={loading} type="submit" style={{ justifyContent: "center" }}>
              {loading ? "Aguarde…" : mode === "senha" ? "Entrar" : "Receber link de acesso"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
