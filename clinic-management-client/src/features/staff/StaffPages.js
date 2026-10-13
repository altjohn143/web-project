import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { Archive, ArchiveRestore, Pencil, Stethoscope, Users, X } from "lucide-react";
import api from "../../api";
import PasswordInput from "../../components/common/PasswordInput";
import { PatientsPage, RecordsPage } from "../../DataPages";
import { medicalSpecialties, strongPassword } from "../../utils/clinic";

export function Doctors({ user }) {
  const [doctors, setDoctors] = useState([]),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null);
  const load = useCallback(
    () =>
      api
        .get("/users", { params: { role: "doctor" } })
        .then(({ data }) => {
          setDoctors(data);
          setError("");
        })
        .catch(() => setError("Unable to load doctors.")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="page">
      <section className="subhero">
        <div className="eyebrow">
          <span>04</span> Clinical team
        </div>
        <h1>
          Care from
          <br />
          <em>people who listen.</em>
        </h1>
        <button className="primary" onClick={() => { setEditing(null); setOpen(true); }}>
          Add doctor -&gt;
        </button>
      </section>
      <div className="expertise-intro">
        <p>
          Administrators manage practitioner accounts, specialties, and access
          to assigned clinic records.
        </p>
      </div>
      {error && <div className="form-error api-error">{error}</div>}
      <div className="doctor-grid">
        {doctors.map((doctor, index) => (
          <article className="doctor-card" key={doctor._id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div className="doctor-avatar">
              <Stethoscope />
            </div>
            <div>
              <small>{doctor.specialty}</small>
              <h2>{doctor.name}</h2>
              <p>
                Authorized practitioner access for assigned appointments,
                patients, and medical records.
              </p>
              <a href={`mailto:${doctor.email}`}>{doctor.email} -&gt;</a>
              <AccountActions member={doctor} user={user} onEdit={() => { setEditing(doctor); setOpen(true); }} onChanged={load} />
            </div>
          </article>
        ))}
      </div>
      {open && (
        <AccountModal
          role="doctor" item={editing}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
export function StaffAccounts({ user }) {
  const [staff, setStaff] = useState([]),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null);
  const load = useCallback(
    () =>
      api
        .get("/users")
        .then(({ data }) => {
          setStaff(data);
          setError("");
        })
        .catch((e) =>
          setError(
            e.response?.data?.message ||
              "Unable to load staff accounts.",
          ),
        ),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="page">
      <section className="subhero">
        <div className="eyebrow">
          <span>06</span> Account management
        </div>
        <h1>
          Staff accounts,
          <br />
          <em>governed.</em>
        </h1>
        <button className="primary" onClick={() => { setEditing(null); setOpen(true); }}>
          Add staff -&gt;
        </button>
      </section>
      {error && <div className="form-error api-error">{error}</div>}
      <div className="data-table staff-table">
        {staff.length ? (
          staff.map((member) => (
            <div className="data-row" key={member._id}>
              <div className="data-icon">
                <Users />
              </div>
              <div>
                <b>{member.name}</b>
                <span>{member.email}</span>
              </div>
              <div>
                <small>Role</small>
                <span>{roleName(member.role)}</span>
              </div>
              <div>
                <small>Created</small>
                <span>{new Date(member.createdAt).toLocaleDateString()}</span>
              </div>
              <AccountActions member={member} user={user} onEdit={() => { setEditing(member); setOpen(true); }} onChanged={load} />
            </div>
          ))
        ) : (
          <div className="empty">No staff accounts yet.</div>
        )}
      </div>
      {open && (
        <AccountModal
          roles={user.role === "superadmin"
            ? ["admin", "receptionist", "doctor", "nurse", "billing", "laboratory"]
            : ["receptionist", "doctor", "nurse", "billing", "laboratory"]}
          item={editing}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
function AccountActions({ member, user, onEdit, onChanged }) {
  if (!user) return null;
  const canManage = user.role === "superadmin" ? member.role !== "superadmin" : !["superadmin", "admin"].includes(member.role);
  if (!canManage) return null;
  const toggleArchive = async () => {
    const action = member.isActive === false ? "restore" : "archive";
    if (!window.confirm(`${action === "archive" ? "Archive" : "Restore"} ${member.name}'s account?`)) return;
    try { await api.patch(`/users/${member._id}/${action}`); onChanged(); }
    catch (e) { window.alert(e.response?.data?.message || `Unable to ${action} account.`); }
  };
  return <div className="account-actions">
    <span className={`account-state ${member.isActive === false ? "archived" : ""}`}>{member.isActive === false ? "Archived" : "Active"}</span>
    <button type="button" onClick={onEdit} aria-label={`Edit ${member.name}`} title="Edit account"><Pencil /></button>
    <button type="button" onClick={toggleArchive} aria-label={`${member.isActive === false ? "Restore" : "Archive"} ${member.name}`} title={member.isActive === false ? "Restore account" : "Archive account"}>{member.isActive === false ? <ArchiveRestore /> : <Archive />}</button>
  </div>;
}
const roleName = (role) => ({
  admin: "Administrator",
  receptionist: "Receptionist",
  doctor: "Doctor",
  nurse: "Nurse",
  billing: "Billing / Cashier",
  laboratory: "Laboratory Staff",
}[role] || role);

function AccountModal({ role, roles, item, onClose, onCreated }) {
  const [form, setForm] = useState({
      name: item?.name || "",
      email: item?.email || "",
      password: "",
      confirm: "",
      specialty: item?.specialty || "",
      role: item?.role || role || roles?.[0] || "receptionist",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!item && !strongPassword.test(form.password))
      return setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
      );
    if (form.password && !strongPassword.test(form.password)) return setError("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.");
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    try {
      setBusy(true);
      const accountRole = role || form.role;
      const payload = {
        name: form.name,
        email: form.email,
        role: accountRole,
        specialty: form.specialty,
      };
      if (form.password) payload.password = form.password;
      if (item) await api.put(`/users/${item._id}`, payload);
      else await api.post("/users", payload);
      onCreated();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.errors?.[0]?.msg ||
          `Unable to create ${roleName(role || form.role)} account.`,
      );
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <button type="button" className="modal-x" onClick={onClose}>
          <X />
        </button>
        <div className="eyebrow">Authorized account management</div>
        <h2>{item ? "Edit" : "Add"} {roleName(role || form.role)}</h2>
        {roles && (
          <label>
            Staff role
            <select value={form.role} disabled={Boolean(item)} onChange={(e) => setForm({ ...form, role: e.target.value, specialty: "" })}>
              {roles.map((value) => <option key={value} value={value}>{roleName(value)}</option>)}
            </select>
          </label>
        )}
        <label>
          Full name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            minLength="2"
            required
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        {(role || form.role) === "doctor" && (
          <label>
            Medical specialty
            <select
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              required
            >
              <option value="">Select specialty</option>
              {medicalSpecialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="form-row">
          <label>
            {item ? "New password (optional)" : "Temporary password"}
            <PasswordInput
              name="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              minLength="8"
              required={!item}
            />
            <small className="password-help">{item ? "Leave blank to keep the existing password." : "8+ characters with uppercase, lowercase, number, and symbol."}</small>
          </label>
          <label>
            Confirm password
            <PasswordInput
              name="confirmPassword"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              autoComplete="new-password"
              minLength="8"
              required={!item}
            />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="primary full" disabled={busy}>
          {busy ? "Saving..." : item ? "Save account changes" : `Create ${roleName(role || form.role)} account`}
        </button>
      </form>
    </div>,
    document.body,
  );
}
export function Module({ title, text, icon }) {
  if (title === "Doctors") return <Doctors />;
  if (title === "Patients") return <PatientsPage />;
  if (title === "Medical records") return <RecordsPage />;
  return (
    <div className="page">
      <div className="coming">
        {icon}
        <div className="eyebrow">Protected module</div>
        <h1>{title}</h1>
        <p>{text}</p>
        <NavLink className="primary" to="/">
          Return to overview
        </NavLink>
      </div>
    </div>
  );
}
