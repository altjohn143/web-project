import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2, X } from "lucide-react";
import api from "../../api";
import { appointmentBlank as blank, initials } from "../../utils/clinic";

export function AppointmentList({ items, loading }) {
  return (
    <article className="appointments-card">
      <div className="card-head">
        <div>
          <div className="eyebrow">Daily schedule</div>
          <h3>Appointments</h3>
        </div>
        <NavLink to="/appointments">
          View all <ChevronRight />
        </NavLink>
      </div>
      {loading ? (
        <div className="empty">Loading recordsâ€¦</div>
      ) : items.length ? (
        items.slice(0, 4).map((a) => <AppointmentRow key={a._id} item={a} />)
      ) : (
        <div className="empty">No records yet. Add your first appointment.</div>
      )}
    </article>
  );
}
function AppointmentRow({ item, user, onView, onEdit, onDelete, onStatus }) {
  const date = new Date(item.date),
    doctor = user?.role === "doctor",
    final = ["Completed", "Cancelled"].includes(item.status);
  return (
    <div className="appointment">
      <div className="avatar">{initials(item.patient)}</div>
      <div className="patient">
        <b>{item.patient}</b>
        <span>{item.reason}</span>
      </div>
      <div className="doctor">
        <small>Practitioner</small>
        <span>{item.doctor}</span>
      </div>
      <div className="time">
        <small>Date</small>
        <b>
          {isNaN(date)
            ? "â€”"
            : date.toLocaleDateString([], { month: "short", day: "numeric" })}
        </b>
      </div>
      <span className={`status ${item.status.toLowerCase()}`}>
        {item.status}
      </span>
      {onView ? (
        <div className="row-actions workflow-actions">
          <button
            className="appointment-view"
            onClick={() => onView(item)}
            aria-label="View all appointment details"
          >
            <Eye /> <span>View</span>
          </button>
          {!final && onEdit && (
            <button onClick={() => onEdit(item)} aria-label="Edit appointment">
              <Pencil />
            </button>
          )}
          {doctor && item.status === "Pending" && (
            <button
              className="confirm-action"
              onClick={() => onStatus(item, "Confirmed")}
            >
              Confirm
            </button>
          )}
          {doctor && item.status === "Confirmed" && (
            <>
              <button
                className="complete-action"
                onClick={() => onStatus(item, "Completed")}
              >
                Complete
              </button>
              <button
                className="cancel-action"
                onClick={() => onStatus(item, "Cancelled")}
              >
                Cancel
              </button>
            </>
          )}
          {!doctor && !final && onDelete && (
            <button onClick={() => onDelete(item._id)} aria-label="Delete">
              <Trash2 />
            </button>
          )}
        </div>
      ) : (
        <button>
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
export function Appointments({
  user,
  items,
  total,
  page,
  pages,
  setPage,
  onAdd,
  onEdit,
  onDelete,
  onStatus,
  loading,
  error,
}) {
  const [viewing, setViewing] = useState(null);
  return (
    <div className="page">
      <section className="subhero">
        <div className="eyebrow">
          <span>02</span> Appointment workflow
        </div>
        <h1>
          Appointments,
          <br />
          <em>managed.</em>
        </h1>
        {onAdd && (
          <button className="primary" onClick={onAdd}>
            Add appointment â†—
          </button>
        )}
      </section>
      <article className="appointments-card full-card">
        <div className="card-head">
          <h3>
            {user.role === "doctor"
              ? "My assigned appointments"
              : "All appointments"}
          </h3>
          <span>{total} records</span>
        </div>
        {error && <div className="form-error api-error">{error}</div>}
        {loading ? (
          <div className="empty">Loadingâ€¦</div>
        ) : (
          items.map((i) => (
            <AppointmentRow
              key={i._id}
              item={i}
              user={user}
              onView={setViewing}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatus={onStatus}
            />
          ))
        )}
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft /> Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight />
          </button>
        </div>
      </article>
      {viewing && (
        <AppointmentDetails item={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
function AppointmentDetails({ item, onClose }) {
  const date = new Date(item.date),
    show = (value) => value || "â€”";
  return createPortal(
    <div className="modal-backdrop details-backdrop">
      <article
        className="modal details-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Appointment details"
      >
        <button type="button" className="modal-x" onClick={onClose}>
          <X />
        </button>
        <div className="eyebrow">Read-only appointment</div>
        <h2>Appointment details</h2>
        <section>
          <h3>Patient and schedule</h3>
          <dl className="details-grid">
            <div>
              <dt>Patient name</dt>
              <dd>{show(item.patient)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{show(item.email)}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{show(item.phone)}</dd>
            </div>
            <div>
              <dt>Birth date</dt>
              <dd>
                {item.birthDate
                  ? new Date(item.birthDate).toLocaleDateString()
                  : "â€”"}
              </dd>
            </div>
            <div>
              <dt>Sex</dt>
              <dd>{show(item.sex)}</dd>
            </div>
            <div className="details-wide">
              <dt>Address</dt>
              <dd>{show(item.address)}</dd>
            </div>
            <div>
              <dt>Date and time</dt>
              <dd>{isNaN(date) ? "â€”" : date.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Assigned doctor</dt>
              <dd>{show(item.doctor)}</dd>
            </div>
            <div className="details-wide">
              <dt>Reason</dt>
              <dd>{show(item.reason)}</dd>
            </div>
          </dl>
        </section>
        <section className="clinical-details">
          <h3>Clinical information</h3>
          <dl className="details-grid">
            <div className="details-wide">
              <dt>Diagnosis</dt>
              <dd>{show(item.diagnosis)}</dd>
            </div>
            <div className="details-wide">
              <dt>Treatment</dt>
              <dd>{show(item.treatment)}</dd>
            </div>
            <div className="details-wide">
              <dt>Clinical notes</dt>
              <dd>{show(item.notes)}</dd>
            </div>
          </dl>
        </section>
        <button className="primary full" onClick={onClose}>
          Close details
        </button>
      </article>
    </div>,
    document.body,
  );
}
export function AppointmentModal({ item, user, onClose, onSave }) {
  const doctorUser = user.role === "doctor";
  const initial = item
    ? {
        ...blank,
        ...item,
        date: new Date(item.date).toISOString().slice(0, 16),
        birthDate: item.birthDate
          ? new Date(item.birthDate).toISOString().slice(0, 10)
          : "",
      }
    : { ...blank, doctor: doctorUser ? user.name : "" };
  const [form, setForm] = useState(initial),
    [doctors, setDoctors] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .get("/doctors")
      .then(({ data }) => {
        setDoctors(data);
        if (!item)
          setForm((f) => ({
            ...f,
            doctor: doctorUser ? user.name : f.doctor || data[0]?.name || "",
          }));
      })
      .catch(() => setError("Unable to load doctors from the database."));
  }, [item, doctorUser, user.name]);
  const change = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setBusy(true);
      await onSave(form);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.errors?.[0]?.msg ||
          "Unable to save record.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <form className="modal appointment-modal" onSubmit={submit}>
        <button type="button" className="modal-x" onClick={onClose}>
          <X />
        </button>
        <div className="eyebrow">{item ? "Update" : "Create"} appointment</div>
        <h2>{item ? "Edit appointment" : "Book appointment"}</h2>
        <div className="automatic-status">
          <span>Status</span>
          <b className={`status ${(item?.status || "Pending").toLowerCase()}`}>
            {item?.status || "Pending"}
          </b>
          <small>
            {item
              ? "Status changes through the doctor action buttons."
              : "New appointments automatically start as pending."}
          </small>
        </div>
        <div className="form-row">
          <label>
            Patient name
            <input
              value={form.patient}
              onChange={(e) => change("patient", e.target.value)}
              minLength="2"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => change("phone", e.target.value)}
            />
          </label>
          <label>
            Birth date
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => change("birthDate", e.target.value)}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Sex
            <select
              value={form.sex}
              onChange={(e) => change("sex", e.target.value)}
            >
              <option value="">Select</option>
              {["Female", "Male", "Other"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Address
            <input
              value={form.address}
              onChange={(e) => change("address", e.target.value)}
            />
          </label>
        </div>
        <label>
          Reason
          <input
            value={form.reason}
            onChange={(e) => change("reason", e.target.value)}
            minLength="2"
            required
          />
        </label>
        <div className="form-row">
          <label>
            Date and time
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => change("date", e.target.value)}
              required
            />
          </label>
          <label>
            Doctor
            <select
              value={form.doctor}
              onChange={(e) => change("doctor", e.target.value)}
              disabled={doctorUser}
              required
            >
              <option value="">Select doctor</option>
              {doctorUser && !doctors.some((d) => d.name === user.name) && (
                <option value={user.name}>{user.name}</option>
              )}
              {doctors.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name} â€” {d.specialty}
                </option>
              ))}
            </select>
          </label>
        </div>
        {doctorUser && item && item.status !== "Cancelled" && (
          <section className="completion-fields">
            <p>
              Add the clinical details before pressing Complete. Completion
              automatically creates the assigned patient and medical record.
            </p>
            <label>
              Diagnosis
              <textarea
                value={form.diagnosis}
                onChange={(e) => change("diagnosis", e.target.value)}
                minLength="2"
              />
            </label>
            <label>
              Treatment
              <textarea
                value={form.treatment}
                onChange={(e) => change("treatment", e.target.value)}
                minLength="2"
              />
            </label>
            <label>
              Clinical notes
              <textarea
                value={form.notes}
                onChange={(e) => change("notes", e.target.value)}
              />
            </label>
          </section>
        )}
        {error && <div className="form-error">{error}</div>}
        <button className="primary full" disabled={busy}>
          {busy
            ? "Savingâ€¦"
            : item
              ? "Save appointment details"
              : "Add pending appointment"}
        </button>
      </form>
    </div>
  );
}
