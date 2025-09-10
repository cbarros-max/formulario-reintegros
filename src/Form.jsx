console.log("BUILD:", import.meta.env.VITE_BUILD_ID);
// y para ver las env efectivas en runtime:
console.log("ENV:", {
  VITE_FLOW_URL: import.meta.env.VITE_FLOW_URL,
  VITE_API_KEY: import.meta.env.VITE_API_KEY
});


import { useState } from "react";

const opciones = ["Medicamentos", "Estudios", "Internación", "Consultas", "Otros"];

export default function Form() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    tipoReintegro: "",
    comentarios: "",
    adjunto: null,
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "adjunto") {
      setForm((f) => ({ ...f, adjunto: files?.[0] || null }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result || "").toString().split(",")[1] || "");
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  // Para archivos sin MIME type, adivinamos por extensión (mejora UX/compatibilidad)
  const mimeFromName = (name = "") => {
    const n = name.toLowerCase();
    if (n.endsWith(".pdf")) return "application/pdf";
    if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
    if (n.endsWith(".png")) return "image/png";
    if (n.endsWith(".doc")) return "application/msword";
    if (n.endsWith(".docx"))
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return "application/octet-stream";
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);

    // Validaciones mínimas
    if (!form.nombre || !form.apellido || !form.dni || !form.tipoReintegro || !form.adjunto) {
      setStatus({ ok: false, msg: "Completá todos los campos y adjuntá el archivo." });
      return;
    }
    if (form.adjunto.size > 20 * 1024 * 1024) {
      setStatus({ ok: false, msg: "El archivo supera los 20 MB." });
      return;
    }

    // ⛑️ Lee y valida variables de entorno (evita .includes sobre undefined)
    const FLOW_URL = import.meta.env.VITE_FLOW_URL || "";
    const API_KEY = import.meta.env.VITE_API_KEY || "";

    if (!FLOW_URL) {
      setStatus({ ok: false, msg: "Falta configurar VITE_FLOW_URL en la app." });
      return;
    }

    // Si tu Flow usa ‘code=...’ en la query, lo agregamos de forma segura:
    const url =
      API_KEY && API_KEY.trim()
        ? `${FLOW_URL}${FLOW_URL.indexOf("?") >= 0 ? "&" : "?"}code=${encodeURIComponent(API_KEY)}`
        : FLOW_URL;

    // Si tu Flow espera clave por header (x-api-key), descomentá la línea
    const headers = {
      "Content-Type": "application/json",
      // "x-api-key": API_KEY, // ← Usalo solo si el Flow espera API Key por header
    };

    setSending(true);
    try {
      const base64 = await toBase64(form.adjunto);

      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.trim(),
        tipoReintegro: form.tipoReintegro,
        comentarios: form.comentarios?.trim() || "",
        archivo: {
          nombre: form.adjunto.name,
          tipo: form.adjunto.type || mimeFromName(form.adjunto.name),
          tamano: form.adjunto.size,
          contenido: base64,
        },
        submittedAt: new Date().toISOString(),
        canal: "react-public-form",
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Devuelve detalle de error si es posible
        let details = "";
        try {
          const ct = res.headers.get("content-type") || "";
          details =
            ct.indexOf("application/json") >= 0
              ? JSON.stringify(await res.json())
              : await res.text();
        } catch {}
        throw new Error(`HTTP ${res.status}${details ? " - " + details : ""}`);
      }

      setStatus({ ok: true, msg: "¡Enviado con éxito!" });
      setForm({
        nombre: "",
        apellido: "",
        dni: "",
        tipoReintegro: "",
        comentarios: "",
        adjunto: null,
      });
      e.target.reset();
    } catch (err) {
      setStatus({ ok: false, msg: "Error al enviar: " + (err?.message || err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="wrap">
      <header className="hero">
        <h1>Solicitud de Reintegro</h1>
        <p>Completá el formulario y adjuntá la documentación.</p>
      </header>

      <form className="card" onSubmit={submit}>
        <div className="grid">
          <div className="field">
            <label>Nombre</label>
            <input name="nombre" value={form.nombre} onChange={onChange} required />
          </div>

          <div className="field">
            <label>Apellido</label>
            <input name="apellido" value={form.apellido} onChange={onChange} required />
          </div>

          <div className="field">
            <label>DNI</label>
            <input name="dni" value={form.dni} onChange={onChange} required />
          </div>

          <div className="field">
            <label>Tipo de reintegro</label>
            <select
              name="tipoReintegro"
              value={form.tipoReintegro}
              onChange={onChange}
              required
            >
              <option value="" disabled>
                Seleccioná…
              </option>
              {opciones.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          <div className="field span-2">
            <label>Adjunto (PDF/Imagen/Word)</label>
            <input
              name="adjunto"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={onChange}
              required
            />
            <small className="hint">Máx. 20 MB — se envía de forma segura.</small>
          </div>

          <div className="field span-2">
            <label>Comentarios</label>
            <textarea
              name="comentarios"
              rows={4}
              value={form.comentarios}
              onChange={onChange}
            />
          </div>
        </div>

        <div className="actions">
          <button className="btn" type="submit" disabled={sending}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>

        {status && <div className={`alert ${status.ok ? "ok" : "err"}`}>{status.msg}</div>}
      </form>

      <footer className="foot">
        <small>© {new Date().getFullYear()} Reintegros</small>
      </footer>
    </section>
  );
}
