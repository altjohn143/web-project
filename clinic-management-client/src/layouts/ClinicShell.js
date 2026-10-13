import { useCallback, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Activity, Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardPlus, DollarSign, HeartPulse, LayoutDashboard, LogOut, Menu, Search, UserRound, Users, X } from "lucide-react";
import { useAuth } from "../AuthContext";
import api from "../api";
import { initials } from "../utils/clinic";
import Dashboard from "../pages/DashboardPage";
import ProfilePage from "../pages/ProfilePage";
import { Appointments, AppointmentModal } from "../features/appointments/AppointmentComponents";
import { StaffAccounts } from "../features/staff/StaffPages";
import { BillingPage } from "../OperationsPages";
import { DocumentsPage, NotificationsPage, PrescriptionsPage, QueuePage } from "../WorkflowPages";
import { PatientsPage, RecordsPage } from "../DataPages";
import { confirmDialog } from "../components/common/AppDialogs";
import useSilentRefresh from "../hooks/useSilentRefresh";

export default function ClinicShell() {
  const { user, logout } = useAuth();
  const role = user.role;
  const isSuper = role === "superadmin";
  const appointmentAccess = ["receptionist", "superadmin"].includes(role);
  const canSchedule = role === "receptionist";
  const patientAccess = role !== "nurse";
  const recordAccess = ["superadmin", "doctor", "nurse"].includes(role);
  const billingAccess = ["superadmin", "billing"].includes(role);
  const staffAccess = role === "superadmin";
  const queueAccess = ["doctor", "nurse"].includes(role);
  const prescriptionAccess = ["superadmin", "doctor"].includes(role);
  const documentAccess = role === "superadmin";
  const roleLabels = {
    superadmin: "Superadmin",
    receptionist: "Receptionist",
    doctor: "Doctor portal",
    nurse: "Nurse portal",
    billing: "Billing / Cashier",
  };
  const [mobile, setMobile] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [query, setQuery] = useState(""),
    [appointmentStatus, setAppointmentStatus] = useState("all"),
    [appointmentSort, setAppointmentSort] = useState("date"),
    [appointmentOrder, setAppointmentOrder] = useState("asc"),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [total, setTotal] = useState(0),
    [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [unreadNotifications, setUnreadNotifications] = useState(0),
    [notifications, setNotifications] = useState([]),
    [notificationOpen, setNotificationOpen] = useState(false);
  const load = useCallback(async (silent = false) => {
    if (!appointmentAccess) {
      setItems([]);
      setTotal(0);
      setPages(1);
      if (!silent) setLoading(false);
      return;
    }
    try {
      if (!silent) { setLoading(true); setError(""); }
      const { data } = await api.get("/appointments", {
        params: { page, limit: 6, q: query, status: appointmentStatus === "all" ? undefined : appointmentStatus, sort: appointmentSort, order: appointmentOrder },
      });
      setItems(data.data);
      setPages(data.pages || 1);
      setTotal(data.total);
    } catch (e) {
      if (!silent) setError("API unavailable. Start the server and try loading the records again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, query, appointmentStatus, appointmentSort, appointmentOrder, appointmentAccess]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  useSilentRefresh(() => load(true));
  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.slice(0, 6));
      setUnreadNotifications(data.filter(item => !item.readBy?.includes(user.id)).length);
    } catch {
      // Notifications must not prevent the rest of the workspace from loading.
    }
  }, [user.id]);
  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 15000);
    const refreshOnFocus = () => document.visibilityState === "visible" && loadNotifications();
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refreshOnFocus); };
  }, [loadNotifications]);
  const markNotificationRead = async id => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await loadNotifications();
    } catch {
      // Leaving an item unread is safer than interrupting the user's work.
    }
  };
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
    if (prompt && !await confirmDialog({ title: "Confirm appointment update", message: prompt, confirmLabel: "Continue" })) return;
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
  const checkIn = async (item) => {
    try {
      setError("");
      await api.post(`/workflows/check-in/${item._id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Unable to forward this patient to nursing.");
    }
  };
  const remove = async (id) => {
    if (await confirmDialog({ title: "Delete appointment", message: "Delete this appointment? This action cannot be undone.", confirmLabel: "Delete" })) {
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
      <aside className={`sidebar${mobile ? " open" : ""}${sidebarCollapsed ? " collapsed" : ""}`}>
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
        <button className="sidebar-toggle" type="button" onClick={() => setSidebarCollapsed(current => !current)} aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}>
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
        <nav>
          <p>
            {isSuper ? "System administration" : role === "billing" ? "Financial workspace" : "Clinical workspace"}
          </p>
          {!isSuper && <NavLink to="/dashboard" data-tooltip="Dashboard" aria-label="Dashboard">
            <LayoutDashboard />{" "}
            My dashboard
          </NavLink>}
          {appointmentAccess && <NavLink to="/appointments" data-tooltip="Appointments" aria-label="Appointments">
            <CalendarDays /> {role === "doctor" ? "My appointments" : "Appointments"}{" "}
            <b>{total}</b>
          </NavLink>}
          {queueAccess && <NavLink to="/queue" data-tooltip={role === "nurse" ? "Vitals intake" : role === "doctor" ? "My assigned appointments" : "Live queue"} aria-label="Live queue">
            <Activity /> {role === "nurse" ? "Vitals intake" : role === "doctor" ? "My assigned appointments" : "Live queue"}
          </NavLink>}
          {patientAccess && <NavLink to="/patients" data-tooltip="Patient Records" aria-label="Patient Records">
            <Users /> Patient Records
          </NavLink>}
          {staffAccess && (
            <NavLink to="/staff" data-tooltip="Staff accounts" aria-label="Staff accounts">
              <Users /> Staff accounts
            </NavLink>
          )}
          {recordAccess && <NavLink to="/records" data-tooltip="Medical records" aria-label="Medical records">
            <ClipboardPlus /> Medical records
          </NavLink>}
          {billingAccess && <NavLink to="/billing" data-tooltip="Billing" aria-label="Billing">
            <DollarSign /> Billing
          </NavLink>}
          {prescriptionAccess && <NavLink to="/prescriptions" data-tooltip="Prescriptions" aria-label="Prescriptions">
            <ClipboardPlus /> Prescriptions
          </NavLink>}
          {documentAccess && <NavLink to="/documents" data-tooltip="Documents" aria-label="Documents">
            <ClipboardPlus /> Documents
          </NavLink>}
          <p>Account</p>
          <NavLink to="/profile" data-tooltip="Profile" aria-label="Profile">
            <UserRound /> Profile
          </NavLink>
        </nav>
        <button className="logout" data-tooltip="Sign out" onClick={logout}>
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
              placeholder="Search appointments..."
            />
          </div>
          <div className="role-badge">{roleLabels[role] || role}</div>
          <div className="notification-menu">
            <button type="button" className="notification-bell" aria-expanded={notificationOpen} aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`} onClick={() => setNotificationOpen(current => !current)}>
              <Bell />
              {unreadNotifications > 0 && <b>{unreadNotifications > 9 ? "9+" : unreadNotifications}</b>}
            </button>
            {notificationOpen && <div className="notification-dropdown" role="dialog" aria-label="Notifications">
              <div className="notification-dropdown-head"><b>Notifications</b><span>{unreadNotifications ? `${unreadNotifications} unread` : "All caught up"}</span></div>
              <div className="notification-dropdown-list">{notifications.length ? notifications.map(item => { const unread = !item.readBy?.includes(user.id); return <button type="button" key={item._id} className={unread ? "unread" : ""} onClick={() => unread && markNotificationRead(item._id)}><strong>{item.title}</strong><span>{item.message}</span></button>; }) : <p>No notifications yet.</p>}</div>
            </div>}
          </div>
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
              isSuper ? <Navigate to="/records" replace /> : <Dashboard
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
          <Route
            path="/dashboard"
            element={
              isSuper ? <Navigate to="/records" replace /> : <Dashboard
                user={user}
                items={items}
                total={total}
                onAdd={canSchedule ? () => { setEditing(null); setModal(true); } : null}
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
                onEdit={role === "receptionist" ? openEdit : null}
                onDelete={canSchedule ? remove : null}
                onStatus={changeStatus}
                onCheckIn={role === "receptionist" ? checkIn : null}
                query={query}
                setQuery={setQuery}
                statusFilter={appointmentStatus}
                setStatusFilter={setAppointmentStatus}
                sort={appointmentSort}
                setSort={setAppointmentSort}
                order={appointmentOrder}
                setOrder={setAppointmentOrder}
                loading={loading}
                error={error}
              />
            }
          />}
          <Route path="/profile" element={<ProfilePage />} />
          {patientAccess && <Route
            path="/patients"
            element={<PatientsPage />}
          />}
          {staffAccess && <Route path="/staff" element={<StaffAccounts user={user} />} />}
          {recordAccess && <Route
            path="/records"
            element={
              <RecordsPage />
            }
          />}
          {billingAccess && <Route path="/billing" element={<BillingPage />} />}
          {queueAccess && <Route path="/queue" element={<QueuePage />} />}
          {prescriptionAccess && <Route path="/prescriptions" element={<PrescriptionsPage />} />}
          {documentAccess && <Route path="/documents" element={<DocumentsPage />} />}
          <Route path="/notifications" element={<NotificationsPage />} />
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
