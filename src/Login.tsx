import { useState } from "react";
import { supabase } from "./supabase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Correo o contraseña incorrectos.");
    }
    // Si no hay error, el listener de onAuthStateChange en App.tsx
    // detecta la sesión nueva y muestra la app automáticamente.

    setCargando(false);
  };

  return (
    <div style={{
      backgroundColor: "#0f172a",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif"
    }}>
      <form onSubmit={iniciarSesion} style={{
        backgroundColor: "#1e293b",
        padding: "40px",
        borderRadius: "16px",
        width: "360px",
        border: "1px solid #334155"
      }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span style={{ fontSize: "40px" }}>🚛</span>
          <h1 style={{ color: "#f1f5f9", fontSize: "18px", margin: "12px 0 4px" }}>
            Control Transportes
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
            Bachoco Noroeste
          </p>
        </div>

        <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Correo</p>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "white",
            padding: "10px 12px",
            fontSize: "14px",
            marginBottom: "16px",
            boxSizing: "border-box"
          }}
        />

        <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Contraseña</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "white",
            padding: "10px 12px",
            fontSize: "14px",
            marginBottom: "20px",
            boxSizing: "border-box"
          }}
        />

        {error && (
          <p style={{ color: "#c0392b", fontSize: "13px", margin: "0 0 16px" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={cargando}
          style={{
            width: "100%",
            backgroundColor: "#c0392b",
            border: "none",
            borderRadius: "8px",
            color: "white",
            padding: "12px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: cargando ? "default" : "pointer",
            opacity: cargando ? 0.7 : 1
          }}
        >
          {cargando ? "Entrando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}

export default Login;
