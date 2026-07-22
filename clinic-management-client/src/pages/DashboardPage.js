import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Activity, CalendarDays, ClipboardPlus, Clock3, DollarSign, FlaskConical, HeartPulse, Stethoscope, Users } from "lucide-react";
import api from "../api";
import { AppointmentList } from "../features/appointments/AppointmentComponents";

export default function Dashboard({ user, items, onAdd, loading }) {
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
          <NavLink className="primary" to={billing ? "/billing" : "/laboratory"}>Open workspace <span>â†—</span></NavLink>
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
            <em>{doctor ? "Letâ€™s begin." : "in focus."}</em>
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
              ? "CONSULT â€¢ CARE â€¢ FOLLOW UP â€¢"
              : "CARE â€¢ CLARITY â€¢ COMMUNITY â€¢"}
          </small>
        </div>
        {onAdd && (
          <button className="primary" onClick={onAdd}>
            <CalendarDays /> New appointment <span>â†—</span>
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
    "PATIENT CARE âœ¦ APPOINTMENTS âœ¦ MEDICAL RECORDS âœ¦ CLINIC OPERATIONS âœ¦ ";
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
