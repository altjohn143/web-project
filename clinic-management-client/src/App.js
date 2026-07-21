import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Clock3,
  DollarSign,
  Eye,
  EyeOff,
  HeartPulse,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AuthProvider, useAuth } from "./AuthContext";
import api from "./api";
import { PatientsPage, RecordsPage } from "./DataPages";
import { BillingPage, LaboratoryPage } from "./OperationsPages";
import { DocumentsPage, InventoryPage, NotificationsPage, PrescriptionsPage, QueuePage, ReferralsPage } from "./WorkflowPages";
import "./App.css";

const blank = {
  patient: "",
  email: "",
  phone: "",
  birthDate: "",
  sex: "",
  address: "",
  reason: "",
  doctor: "",
  date: "",
  status: "Pending",
  diagnosis: "",
  treatment: "",
  notes: "",
};
const initials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "PT";
const strongPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const medicalSpecialties = [
  "Family Physicians",
  "General Practitioners (GPs)",
  "Internal Medicine Physicians (Internists)",
  "Pediatricians",
  "Obstetrician/Gynecologists (OB-GYNs)",
];
function Protected({ children }) {
  return useAuth().user ? children : <Navigate to="/login" replace />;
}
function PasswordInput({ value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-input">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </span>
  );
}

function AuthPage() {
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
          {busy ? "Please wait…" : "Sign in"} <span>↗</span>
        </button>
        <p className="managed-account-note">
          Need access? Contact a ClaraCare administrator.
        </p>
      </form>
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const role = user.role;
  const isSuper = role === "superadmin";
  const isAdmin = ["admin", "superadmin"].includes(role);
  const appointmentAccess = ["superadmin", "admin", "receptionist", "doctor", "nurse"].includes(role);
  const canSchedule = ["superadmin", "admin", "receptionist"].includes(role);
  const recordAccess = ["superadmin", "admin", "doctor", "nurse"].includes(role);
  const billingAccess = ["superadmin", "admin", "billing"].includes(role);
  const laboratoryAccess = ["superadmin", "admin", "doctor", "nurse", "laboratory"].includes(role);
  const staffAccess = ["superadmin", "admin"].includes(role);
  const queueAccess = ["superadmin", "admin", "receptionist", "doctor", "nurse"].includes(role);
  const prescriptionAccess = ["superadmin", "admin", "doctor", "nurse"].includes(role);
  const referralAccess = ["superadmin", "admin", "receptionist", "doctor", "nurse"].includes(role);
  const inventoryAccess = ["superadmin", "admin", "nurse", "laboratory"].includes(role);
  const documentAccess = ["superadmin", "admin", "doctor", "nurse"].includes(role);
  const roleLabels = {
    superadmin: "Superadmin",
    admin: "Administrator",
    receptionist: "Receptionist",
    doctor: "Doctor portal",
    nurse: "Nurse portal",
    billing: "Billing / Cashier",
    laboratory: "Laboratory staff",
  };
  const [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [total, setTotal] = useState(0),
    [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!appointmentAccess) {
      setItems([]);
      setTotal(0);
      setPages(1);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/appointments", {
        params: { page, limit: 6, q: query },
      });
      setItems(data.data);
      setPages(data.pages || 1);
      setTotal(data.total);
    } catch (e) {
      setError(
        "API unavailable. Start the server and MongoDB to load records.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, query, appointmentAccess]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  const save = async (form) => {
    editing
      ? await api.put(`/appointments/${editing._id}`, form)
      : await api.post("/appointments", form);
    setModal(false);
    setEditing(null);
    await load();
  };
  const changeStatus = async (item, status) => {
    const prompt =
      status === "Completed"
        ? "Complete this appointment and create its patient and medical records?"
        : status === "Cancelled"
          ? "Cancel this appointment because the patient did not attend?"
          : null;
    if (prompt && !window.confirm(prompt)) return;
    try {
      setError("");
      await api.patch(`/appointments/${item._id}/status`, { status });
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to update appointment status.",
      );
    }
  };
  const remove = async (id) => {
    if (window.confirm("Delete this appointment?")) {
      await api.delete(`/appointments/${id}`);
      await load();
    }
  };
  const openEdit = (item) => {
    setEditing(item);
    setModal(true);
  };
  return (
    <div className={`app-shell role-${user.role}`}>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">
            <HeartPulse />
          </span>
          <span>
            CLARA <em>care</em>
          </span>
        </div>
        <button className="close-menu" onClick={() => setMobile(false)}>
          <X />
        </button>
        <nav>
          <p>
            {isSuper
              ? "System administration"
              : isAdmin
                ? "Administration"
                : role === "billing"
                  ? "Financial workspace"
                  : role === "laboratory"
                    ? "Laboratory workspace"
                    : "Clinical workspace"}
          </p>
          <NavLink to="/">
            <LayoutDashboard />{" "}
            {isSuper
              ? "System overview"
              : isAdmin
                ? "Clinic overview"
                : "My dashboard"}
          </NavLink>
          {appointmentAccess && <NavLink to="/appointments">
            <CalendarDays /> {role === "doctor" ? "My appointments" : "Appointments"}{" "}
            <b>{total}</b>
          </NavLink>}
          {queueAccess && <NavLink to="/queue">
            <Activity /> Live queue
          </NavLink>}
          <NavLink to="/patients">
            <Users /> Patients
          </NavLink>
          {isAdmin && (
            <NavLink to="/doctors">
              <Stethoscope /> Doctors
            </NavLink>
          )}
          {staffAccess && (
            <NavLink to="/staff">
              <Users /> Staff accounts
            </NavLink>
          )}
          {recordAccess && <NavLink to="/records">
            <ClipboardPlus /> Medical records
          </NavLink>}
          {billingAccess && <NavLink to="/billing">
            <DollarSign /> Billing
          </NavLink>}
          {laboratoryAccess && <NavLink to="/laboratory">
            <FlaskConical /> Laboratory
          </NavLink>}
          {prescriptionAccess && <NavLink to="/prescriptions">
            <ClipboardPlus /> Prescriptions
          </NavLink>}
          {referralAccess && <NavLink to="/referrals">
            <Users /> Referrals
          </NavLink>}
          {inventoryAccess && <NavLink to="/inventory">
            <ClipboardPlus /> Inventory
          </NavLink>}
          {documentAccess && <NavLink to="/documents">
            <ClipboardPlus /> Documents
          </NavLink>}
          <p>Account</p>
          <NavLink to="/notifications">
            <Activity /> Notifications
          </NavLink>
          <NavLink to="/profile">
            <UserRound /> Profile
          </NavLink>
          {isAdmin && (
            <NavLink to="/settings">
              <Settings /> Settings
            </NavLink>
          )}
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut /> Sign out
        </button>
      </aside>
      <main>
        <header>
          <button className="menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="search">
            <Search />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={
                isAdmin
                  ? "Search clinic appointments..."
                  : "Search my appointments..."
              }
            />
          </div>
          <div className="role-badge">{roleLabels[role] || role}</div>
          <NavLink to="/profile" className="profile-chip">
            <div>{initials(user.name)}</div>
            <span>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </span>
          </NavLink>
        </header>
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                user={user}
                items={items}
                total={total}
                onAdd={
                  canSchedule
                    ? () => {
                        setEditing(null);
                        setModal(true);
                      }
                    : null
                }
                loading={loading}
              />
            }
          />
          {appointmentAccess && <Route
            path="/appointments"
            element={
              <Appointments
                user={user}
                items={items}
                total={total}
                page={page}
                pages={pages}
                setPage={setPage}
                onAdd={
                  canSchedule
                    ? () => {
                        setEditing(null);
                        setModal(true);
                      }
                    : null
                }
                onEdit={role === "nurse" ? null : openEdit}
                onDelete={canSchedule ? remove : null}
                onStatus={changeStatus}
                loading={loading}
                error={error}
              />
            }
          />}
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/patients"
            element={
              <Module
                title="Patients"
                text="Patient registration and demographic records connect here."
                icon={<Users />}
              />
            }
          />
          {isAdmin && (
            <Route path="/doctors" element={<Doctors user={user} />} />
          )}{" "}
          {staffAccess && <Route path="/staff" element={<StaffAccounts user={user} />} />}
          {recordAccess && <Route
            path="/records"
            element={
              <Module
                title="Medical records"
                text="Clinical notes and patient history are protected behind authentication."
                icon={<ClipboardPlus />}
              />
            }
          />}
          {billingAccess && <Route path="/billing" element={<BillingPage />} />}
          {laboratoryAccess && <Route path="/laboratory" element={<LaboratoryPage />} />}
          {queueAccess && <Route path="/queue" element={<QueuePage />} />}
          {prescriptionAccess && <Route path="/prescriptions" element={<PrescriptionsPage />} />}
          {referralAccess && <Route path="/referrals" element={<ReferralsPage />} />}
          {inventoryAccess && <Route path="/inventory" element={<InventoryPage />} />}
          {documentAccess && <Route path="/documents" element={<DocumentsPage />} />}
          <Route path="/notifications" element={<NotificationsPage />} />
          {isAdmin && (
            <Route
              path="/settings"
              element={
                <Module
                  title="Settings"
                  text="Clinic preferences and security configuration."
                  icon={<Settings />}
                />
              }
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {modal && (
        <AppointmentModal
          item={editing}
          user={user}
          onClose={() => {
            setModal(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}
    </div>
  );
}

function Dashboard({ user, items, onAdd, loading }) {
  const [metrics, setMetrics] = useState({
    appointments: 0,
    patients: 0,
    records: 0,
    confirmed: 0,
    completed: 0,
    today: 0,
  });
  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setMetrics(data));
  }, []);
  if (["billing", "laboratory"].includes(user.role)) {
    const billing = user.role === "billing";
    return (
      <div className={`page operations-dashboard role-${user.role}`}>
        <section className="welcome">
          <div className="welcome-copy">
            <div className="eyebrow"><span>01</span>{billing ? "Financial operations" : "Diagnostic operations"}</div>
            <h1>{billing ? "Billing," : "Laboratory,"}<br/><em>in focus.</em></h1>
            <p>{billing ? "Manage invoices, payment status, and patient billing records." : "Manage test requests, results, and patient laboratory records."}</p>
          </div>
          <div className="welcome-orbit">{billing ? <DollarSign /> : <FlaskConical />}</div>
          <NavLink className="primary" to={billing ? "/billing" : "/laboratory"}>Open workspace <span>↗</span></NavLink>
        </section>
        <Ticker />
        <section className="stats">
          <article><div className="stat-icon">{billing ? <DollarSign /> : <FlaskConical />}</div><span>{billing ? "Invoices" : "Laboratory records"}</span><strong>{billing ? metrics.invoices || 0 : metrics.laboratory || 0}</strong><small>MongoDB records</small></article>
          <article><div className="stat-icon"><Users /></div><span>Registered patients</span><strong>{metrics.patients}</strong><small>Patient directory</small></article>
        </section>
      </div>
    );
  }
  const doctor = user.role === "doctor";
  return (
    <div className={`page ${doctor ? "doctor-dashboard" : "admin-dashboard"}`}>
      <section className="welcome">
        <div className="welcome-copy">
          <div className="eyebrow">
            <span>01</span>
            {doctor ? "My clinical day" : "Clinic administration"}
          </div>
          <h1>
            {doctor ? "Welcome, doctor." : "Clinic care,"}
            <br />
            <em>{doctor ? "Let’s begin." : "in focus."}</em>
          </h1>
          <p>
            {doctor
              ? `${metrics.specialty || "Clinical care"} workspace with your personal schedule and patient activity.`
              : "Appointments, patients, practitioners, and clinic operations organized in one place."}
          </p>
        </div>
        <div className="welcome-orbit">
          {doctor ? <Stethoscope /> : <HeartPulse />}
          <small>
            {doctor
              ? "CONSULT • CARE • FOLLOW UP •"
              : "CARE • CLARITY • COMMUNITY •"}
          </small>
        </div>
        {onAdd && (
          <button className="primary" onClick={onAdd}>
            <CalendarDays /> New appointment <span>↗</span>
          </button>
        )}
      </section>
      <Ticker />
      <section className="stats">
        <article>
          <div className="stat-icon">
            <CalendarDays />
          </div>
          <span>{doctor ? "My appointments" : "All appointments"}</span>
          <strong>{metrics.appointments}</strong>
          <small>{metrics.today} scheduled today</small>
        </article>
        <article>
          <div className="stat-icon">
            <Users />
          </div>
          <span>{doctor ? "My patients" : "Registered patients"}</span>
          <strong>{metrics.patients}</strong>
          <small>Patient database</small>
        </article>
        <article>
          <div className="stat-icon">
            <Clock3 />
          </div>
          <span>{doctor ? "My confirmed visits" : "Confirmed visits"}</span>
          <strong>{metrics.confirmed}</strong>
          <small>Ready for consultation</small>
        </article>
        <article>
          <div className="stat-icon">
            <ClipboardPlus />
          </div>
          <span>{doctor ? "My medical records" : "Medical records"}</span>
          <strong>{metrics.records}</strong>
          <small>
            {doctor ? "Visits documented by you" : "Clinical visits recorded"}
          </small>
        </article>
      </section>
      <section className="content-grid dashboard-records">
        <AppointmentList items={items} loading={loading} />
        <aside className="right-column">
          <article className="mini-card">
            <div className="card-head">
              <div>
                <div className="eyebrow">
                  {doctor ? "My progress" : "Clinic pulse"}
                </div>
                <h3>{doctor ? "Clinical summary" : "Database summary"}</h3>
              </div>
              <Activity />
            </div>
            <div className="donut-wrap">
              <div className="donut">
                <span>
                  <b>{metrics.completed}</b>
                  <small>completed</small>
                </span>
              </div>
              <ul>
                <li>
                  <i className="dot green" />
                  {doctor ? "My visits" : "Appointments"}{" "}
                  <b>{metrics.appointments}</b>
                </li>
                <li>
                  <i className="dot tan" />
                  Today <b>{metrics.today}</b>
                </li>
                <li>
                  <i className="dot purple" />
                  Records <b>{metrics.records}</b>
                </li>
              </ul>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
function Ticker() {
  const text =
    "PATIENT CARE ✦ APPOINTMENTS ✦ MEDICAL RECORDS ✦ CLINIC OPERATIONS ✦ ";
  return (
    <div className="ticker" aria-label="ClaraCare services">
      <div className="ticker-track">
        <div className="ticker-group">
          <span>{text}</span>
          <span>{text}</span>
        </div>
        <div className="ticker-group" aria-hidden="true">
          <span>{text}</span>
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
}
function AppointmentList({ items, loading }) {
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
        <div className="empty">Loading records…</div>
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
            ? "—"
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
function Appointments({
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
            Add appointment ↗
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
          <div className="empty">Loading…</div>
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
    show = (value) => value || "—";
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
                  : "—"}
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
              <dd>{isNaN(date) ? "—" : date.toLocaleString()}</dd>
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
function AppointmentModal({ item, user, onClose, onSave }) {
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
                  {d.name} — {d.specialty}
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
            ? "Saving…"
            : item
              ? "Save appointment details"
              : "Add pending appointment"}
        </button>
      </form>
    </div>
  );
}
function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name),
    [profileMessage, setProfileMessage] = useState(""),
    [passwords, setPasswords] = useState({
      currentPassword: "",
      newPassword: "",
      confirm: "",
    }),
    [passwordMessage, setPasswordMessage] = useState(""),
    [passwordError, setPasswordError] = useState(false),
    [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put("/auth/profile", { name });
      updateUser(data);
      setProfileMessage("Profile updated.");
    } catch {
      setProfileMessage("Unable to update profile.");
    }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError(false);
    if (!strongPassword.test(passwords.newPassword)) {
      setPasswordError(true);
      return setPasswordMessage(
        "New password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
      );
    }
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError(true);
      return setPasswordMessage("New passwords do not match.");
    }
    try {
      setBusy(true);
      const { data } = await api.put("/auth/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswordMessage(data.message);
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e) {
      setPasswordError(true);
      setPasswordMessage(
        e.response?.data?.message ||
          e.response?.data?.errors?.[0]?.msg ||
          "Unable to change password.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <section className="subhero">
        <div className="eyebrow">
          <span>03</span> User profile
        </div>
        <h1>
          Your clinic
          <br />
          <em>identity.</em>
        </h1>
      </section>
      <div className="profile-grid">
        <form className="profile-form" onSubmit={save}>
          <div className="profile-avatar">{initials(user.name)}</div>
          <div className="eyebrow">Account details</div>
          <label>
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength="2"
              required
            />
          </label>
          <label>
            Email address
            <input value={user.email} disabled />
          </label>
          <label>
            Role
            <input value={user.role} disabled />
          </label>
          {profileMessage && <p>{profileMessage}</p>}
          <button className="primary">Save profile</button>
        </form>
        <form className="profile-form password-form" onSubmit={changePassword}>
          <div className="eyebrow">Account security</div>
          <h2>Change password</h2>
          <p className="password-intro">
            Verify your current password, then choose a new strong password.
          </p>
          <label>
            Current password
            <PasswordInput
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, currentPassword: e.target.value })
              }
              required
            />
          </label>
          <label>
            New password
            <PasswordInput
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
              required
            />
            <small className="password-help">
              8+ characters with uppercase, lowercase, number, and symbol.
            </small>
          </label>
          <label>
            Confirm new password
            <PasswordInput
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              required
            />
          </label>
          {passwordMessage && (
            <p
              className={
                passwordError ? "password-message error" : "password-message"
              }
            >
              {passwordMessage}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
function Doctors() {
  const [doctors, setDoctors] = useState([]),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  const load = useCallback(
    () =>
      api
        .get("/doctors")
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
        <button className="primary" onClick={() => setOpen(true)}>
          Add doctor ↗
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
              <a href={`mailto:${doctor.email}`}>{doctor.email} ↗</a>
            </div>
          </article>
        ))}
      </div>
      {open && (
        <AccountModal
          role="doctor"
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
function StaffAccounts({ user }) {
  const [staff, setStaff] = useState([]),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
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
        <button className="primary" onClick={() => setOpen(true)}>
          Add staff ↗
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
const roleName = (role) => ({
  admin: "Administrator",
  receptionist: "Receptionist",
  doctor: "Doctor",
  nurse: "Nurse",
  billing: "Billing / Cashier",
  laboratory: "Laboratory Staff",
}[role] || role);

function AccountModal({ role, roles, onClose, onCreated }) {
  const [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      confirm: "",
      specialty: "",
      role: role || roles?.[0] || "receptionist",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!strongPassword.test(form.password))
      return setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
      );
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    try {
      setBusy(true);
      const accountRole = role || form.role;
      await api.post("/users", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: accountRole,
        specialty: form.specialty,
      });
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
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <button type="button" className="modal-x" onClick={onClose}>
          <X />
        </button>
        <div className="eyebrow">Authorized account creation</div>
        <h2>Add {roleName(role || form.role)}</h2>
        {roles && (
          <label>
            Staff role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, specialty: "" })}>
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
            Temporary password
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
            />
            <small className="password-help">
              8+ characters with uppercase, lowercase, number, and symbol.
            </small>
          </label>
          <label>
            Confirm password
            <PasswordInput
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              autoComplete="new-password"
              required
            />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="primary full" disabled={busy}>
          {busy ? "Creating…" : `Create ${roleName(role || form.role)} account`}
        </button>
      </form>
    </div>
  );
}
function Module({ title, text, icon }) {
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
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <Protected>
                <Shell />
              </Protected>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
