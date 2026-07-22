import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { useAuth } from "../AuthContext";
import PasswordInput from "../components/common/PasswordInput";

export default function AuthPage() {
  const { user, login } = useAuth(),
    navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setBusy(true);
      await login(form);
      navigate("/");
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.errors?.[0]?.msg ||
          "Unable to connect. Check the server and MongoDB.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <section className="auth-brand">
        <div className="brand">
          <span className="brand-mark">
            <HeartPulse />
          </span>
          <span>
            CLARA <em>care</em>
          </span>
        </div>
        <div>
          <span>AUTHORIZED CLINIC PERSONNEL</span>
          <h1>
            Care,
            <br />
            <em>organized.</em>
          </h1>
        </div>
        <div className="auth-orbit">
          <HeartPulse />
        </div>
      </section>
      <form className="auth-form" onSubmit={submit}>
        <div className="eyebrow">
          <span>01</span>Welcome back
        </div>
        <h2>Sign in.</h2>
        <label>
          Email address
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label>
          Password
          <PasswordInput
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            minLength="8"
            required
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary full" disabled={busy}>
          {busy ? "Please wait..." : "Sign in"} <span>-&gt;</span>
        </button>
        <p className="managed-account-note">
          Need access? Contact a ClaraCare administrator.
        </p>
      </form>
    </div>
  );
}

