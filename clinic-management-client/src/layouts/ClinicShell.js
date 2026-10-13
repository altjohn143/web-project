import { useCallback, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Activity, Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardPlus, DollarSign, FlaskConical, HeartPulse, LayoutDashboard, LogOut, Menu, Search, Settings, Stethoscope, UserRound, Users, X } from "lucide-react";
import { useAuth } from "../AuthContext";
import api from "../api";
import { initials } from "../utils/clinic";
import Dashboard from "../pages/DashboardPage";
import ProfilePage from "../pages/ProfilePage";
import SettingsPage from "../pages/SettingsPage";
import { Appointments, AppointmentModal } from "../features/appointments/AppointmentComponents";
import { Doctors, StaffAccounts, Module } from "../features/staff/StaffPages";
import { BillingPage, LaboratoryPage } from "../OperationsPages";
import { DocumentsPage, InventoryPage, NotificationsPage, PrescriptionsPage, QueuePage, ReferralsPage } from "../WorkflowPages";

export default function ClinicShell() {
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
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [query, setQuery] = useState(""),
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
          <NavLink to="/dashboard" data-tooltip="Dashboard" aria-label="Dashboard">
            <LayoutDashboard />{" "}
            {isSuper
              ? "System overview"
              : isAdmin
                ? "Clinic overview"
                : "My dashboard"}
          </NavLink>
          {appointmentAccess && <NavLink to="/appointments" data-tooltip="Appointments" aria-label="Appointments">
            <CalendarDays /> {role === "doctor" ? "My appointments" : "Appointments"}{" "}
            <b>{total}</b>
          </NavLink>}
          {queueAccess && <NavLink to="/queue" data-tooltip="Live queue" aria-label="Live queue">
            <Activity /> Live queue
          </NavLink>}
          <NavLink to="/patients" data-tooltip="Patients" aria-label="Patients">
            <Users /> Patients
          </NavLink>
          {isAdmin && (
            <NavLink to="/doctors" data-tooltip="Doctors" aria-label="Doctors">
              <Stethoscope /> Doctors
            </NavLink>
          )}
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
          {laboratoryAccess && <NavLink to="/laboratory" data-tooltip="Laboratory" aria-label="Laboratory">
            <FlaskConical /> Laboratory
          </NavLink>}
          {prescriptionAccess && <NavLink to="/prescriptions" data-tooltip="Prescriptions" aria-label="Prescriptions">
            <ClipboardPlus /> Prescriptions
          </NavLink>}
          {referralAccess && <NavLink to="/referrals" data-tooltip="Referrals" aria-label="Referrals">
            <Users /> Referrals
          </NavLink>}
          {inventoryAccess && <NavLink to="/inventory" data-tooltip="Inventory" aria-label="Inventory">
            <ClipboardPlus /> Inventory
          </NavLink>}
          {documentAccess && <NavLink to="/documents" data-tooltip="Documents" aria-label="Documents">
            <ClipboardPlus /> Documents
          </NavLink>}
          <p>Account</p>
          <NavLink to="/profile" data-tooltip="Profile" aria-label="Profile">
            <UserRound /> Profile
          </NavLink>
          {isAdmin && (
            <NavLink to="/settings" data-tooltip="Settings" aria-label="Settings">
              <Settings /> Settings
            </NavLink>
          )}
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
              placeholder={
                isAdmin
                  ? "Search clinic appointments..."
                  : "Search my appointments..."
              }
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
          <Route
            path="/dashboard"
            element={
              <Dashboard
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
                onEdit={role === "nurse" ? null : openEdit}
                onDelete={canSchedule ? remove : null}
                onStatus={changeStatus}
                loading={loading}
                error={error}
              />
            }
          />}
          <Route path="/profile" element={<ProfilePage />} />
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
              element={<SettingsPage />}
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
