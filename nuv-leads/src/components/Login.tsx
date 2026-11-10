import { useState } from "react";
import { supabase } from "../lib/supabase";
import { BigCloud } from "./Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
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
        <p>Leads qualificados, mensagens no tom da NUV e o funil inteiro num lugar só.</p>
        <BigCloud className="cloud" />
      </div>
      <div className="login-form">
        {sent ? (
          <div style={{ maxWidth: 360 }}>
            <h2>Confira seu e-mail</h2>
            <p className="muted">
              Enviamos um link de acesso para <b>{email}</b>. Abra no mesmo navegador para entrar.
            </p>
            <button className="btn" onClick={() => setSent(false)}>Usar outro e-mail</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>Entrar</h2>
            <p className="muted" style={{ margin: 0 }}>Acesso só para a equipe NUV. Você recebe um link por e-mail, sem senha.</p>
            <div className="field">
              <label>E-mail</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@nuv.com" />
            </div>
            {err && <p style={{ color: "var(--danger)", margin: 0 }}>{err}</p>}
            <button className="btn primary" disabled={loading} type="submit" style={{ justifyContent: "center" }}>
              {loading ? "Enviando…" : "Receber link de acesso"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
