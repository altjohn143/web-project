import { useState } from "react";
import { createRoot } from "react-dom/client";

function openDialog(render) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const close = (value) => { root.unmount(); host.remove(); return value; };
  render(close, root);
}

function DialogFrame({ title, children }) {
  return <div className="modal-backdrop app-dialog-backdrop"><section className="modal app-dialog" role="dialog" aria-modal="true" aria-label={title}>{children}</section></div>;
}

export function confirmDialog({ title = "Please confirm", message, confirmLabel = "Confirm" }) {
  return new Promise((resolve) => openDialog((close, root) => root.render(<DialogFrame title={title}><div className="eyebrow">Confirmation</div><h2>{title}</h2><p>{message}</p><div className="dialog-actions"><button className="secondary" onClick={() => resolve(close(false))}>Cancel</button><button className="primary" onClick={() => resolve(close(true))}>{confirmLabel}</button></div></DialogFrame>)));
}

export function textDialog({ title, label, initialValue = "", type = "text", min = undefined, placeholder = "", confirmLabel = "Save" }) {
  return new Promise((resolve) => openDialog((close, root) => {
    function TextDialog() {
      const [value, setValue] = useState(initialValue);
      const submit = (e) => { e.preventDefault(); resolve(close(value)); };
      return <DialogFrame title={title}><form onSubmit={submit}><div className="eyebrow">ClaraCare</div><h2>{title}</h2><label>{label}<input autoFocus type={type} min={min} value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} required /></label><div className="dialog-actions"><button type="button" className="secondary" onClick={() => resolve(close(null))}>Cancel</button><button className="primary">{confirmLabel}</button></div></form></DialogFrame>;
    }
    root.render(<TextDialog />);
  }));
}

export function noticeDialog({ title = "Updated", message }) {
  return new Promise((resolve) => openDialog((close, root) => root.render(<DialogFrame title={title}><div className="eyebrow">ClaraCare</div><h2>{title}</h2><p>{message}</p><div className="dialog-actions"><button className="primary" onClick={() => resolve(close())}>OK</button></div></DialogFrame>)));
}
