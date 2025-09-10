import { useState } from "react";

const opciones = ["Medicamentos", "Estudios", "Internación", "Consultas", "Otros"];

export default function Form() {
  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "",
    tipoReintegro: "", comentarios: "", adjunto: null,
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "adjunto") setForm(f => ({ ...f, adjunto: files?.[0] || null }));
    else setForm(f => ({ ...f, [name]: value }));
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!form.nombre || !form.apellido || !form.dni || !form.tipoReintegro || !form.adjunto) {
      setStatus({ ok:false, msg:"Completá todos los campos y adjuntá el archivo." });
      return;
    }
    if (form.adjunto.size > 20*1024*1024) {
      setStatus({ ok:false, msg:"El archivo supera los 20 MB." });
      return;
    }

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
          tipo: form.adjunto.type || "application/octet-stream",
          tamano: form.adjunto.size,
          contenido: base64,
        },
        submittedAt: new Date().toISOString(),
        canal: "react-public-form",
      };

     // ---- nueva forma: API key por query param, sin header custom ----
const flowUrl = import.meta.env.VITE_FLOW_URL?.trim();
const apiKey  = import.meta.env.VITE_API_KEY?.trim() || "";
const urlWithKey = `${flowUrl}${flowUrl.includes("?") ? "&" : "?"}k=${encodeURIComponent(apiKey)}`;

const res = await fetch(urlWithKey, {
  method: "POST",
  headers: { "Content-Type": "application/json" }, // sin x-api-key => no hay preflight
  body: JSON.stringify(payload),
});


      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus({ ok:true, msg:"¡Enviado con éxito!" });
      setForm({ nombre:"", apellido:"", dni:"", tipoReintegro:"", comentarios:"", adjunto:null });
      e.target.reset();
    } catch (err) {
      setStatus({ ok:false, msg: "Error al enviar: " + err.message });
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
            <select name="tipoReintegro" value={form.tipoReintegro} onChange={onChange} required>
              <option value="" disabled>Seleccioná…</option>
              {opciones.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>

          <div className="field span-2">
            <label>Adjunto (PDF/Imagen/Word)</label>
            <input name="adjunto" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={onChange} required />
            <small className="hint">Máx. 20 MB — se envía de forma segura.</small>
          </div>

          <div className="field span-2">
            <label>Comentarios</label>
            <textarea name="comentarios" rows={4} value={form.comentarios} onChange={onChange} />
          </div>
        </div>

        <div className="actions">
          <button className="btn" type="submit" disabled={sending}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>

        {status && (
          <div className={`alert ${status.ok ? "ok" : "err"}`}>
            {status.msg}
          </div>
        )}
      </form>

      <footer className="foot">
        <small>© {new Date().getFullYear()} Reintegros</small>
      </footer>
    </section>
  );
}
