import { NavLink } from 'react-router-dom';
import { ShieldCheck, Stethoscope, UserRound, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  return <div className="page settings-page">
    <section className="subhero">
      <div className="eyebrow"><span>15</span>Clinic administration</div>
      <h1>Settings,<br/><em>in one place.</em></h1>
      <p>Manage the people, access, and safeguards that keep ClaraCare operating correctly.</p>
    </section>
    <section className="settings-grid">
      <article><Users/><div><h3>Staff accounts</h3><p>Add, review, or deactivate clinic staff with the right role-based access.</p><NavLink className="secondary" to="/staff">Manage staff</NavLink></div></article>
      <article><Stethoscope/><div><h3>Practitioners</h3><p>Maintain doctor accounts and their clinical specialties for appointment assignment.</p><NavLink className="secondary" to="/doctors">Manage doctors</NavLink></div></article>
      <article><UserRound/><div><h3>My profile</h3><p>Update the currently signed-in account and change its password securely.</p><NavLink className="secondary" to="/profile">Open profile</NavLink></div></article>
      <article><ShieldCheck/><div><h3>Security controls</h3><p>Roles limit access to patient, billing, laboratory, and clinical information. Current account: <b>{user.name}</b>.</p><span className="status">{user.role}</span></div></article>
    </section>
  </div>;
}
