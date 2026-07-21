import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardPlus, Eye, Pencil, Trash2, Users, X } from 'lucide-react';
import api from './api';
import { useAuth } from './AuthContext';

const patientBlank = { firstName: '', lastName: '', email: '', phone: '', birthDate: '', sex: 'Female', address: '' };
const recordBlank = { patient: '', doctor: '', visitDate: '', diagnosis: '', treatment: '', notes: '' };
const showDate = value => value ? new Date(value).toLocaleDateString() : '—';
const show = value => value || '—';

export function PatientsPage() { return <CrudPage type="patients" title="Patients" icon={<Users />} blank={patientBlank} />; }
export function RecordsPage() { return <CrudPage type="records" title="Medical records" icon={<ClipboardPlus />} blank={recordBlank} />; }

function CrudPage({ type, title, icon, blank }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]), [page, setPage] = useState(1), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const [q, setQ] = useState(''), [editing, setEditing] = useState(null), [viewing, setViewing] = useState(null), [open, setOpen] = useState(false), [error, setError] = useState('');
  const doctor = user.role === 'doctor';
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/${type}`, { params: { page, limit: 8, q } });
      setItems(data.data); setPages(data.pages); setTotal(data.total); setError('');
    } catch { setError(`Unable to load ${title.toLowerCase()}.`); }
  }, [type, title, page, q]);
  useEffect(() => { load(); }, [load]);
  const remove = async id => { if (window.confirm('Delete this record?')) { await api.delete(`/${type}/${id}`); load(); } };
  const save = async form => { editing ? await api.put(`/${type}/${editing._id}`, form) : await api.post(`/${type}`, form); setOpen(false); setEditing(null); load(); };
  return <div className="page">
    <section className="subhero"><div className="eyebrow"><span>{type === 'patients' ? '03' : '05'}</span> Database records</div><h1>{title},<br /><em>organized.</em></h1><button className="primary" onClick={() => { setEditing(null); setOpen(true); }}>Add record ↗</button></section>
    <div className="module-search"><input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder={`Search ${title.toLowerCase()}...`} /><span>{total} records</span></div>
    {error && <div className="form-error api-error">{error}</div>}
    <div className="data-table">
      {items.length ? items.map(item => <div className="data-row" key={item._id}>
        <div className="data-icon">{icon}</div>
        <div><b>{type === 'patients' ? `${item.firstName} ${item.lastName}` : item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Deleted patient'}</b><span>{type === 'patients' ? item.phone : item.diagnosis}</span></div>
        <div><small>{type === 'patients' ? 'Email' : 'Doctor'}</small><span>{type === 'patients' ? show(item.email) : show(item.doctor?.name)}</span></div>
        <div><small>{type === 'patients' ? 'Birth date' : 'Visit date'}</small><span>{showDate(type === 'patients' ? item.birthDate : item.visitDate)}</span></div>
        <div className="row-actions detail-actions">
          {doctor && <button className="view-details" onClick={() => setViewing(item)} aria-label="View all details"><Eye /> <span>View</span></button>}
          <button onClick={() => { setEditing(item); setOpen(true); }} aria-label="Edit"><Pencil /></button>
          <button onClick={() => remove(item._id)} aria-label="Delete"><Trash2 /></button>
        </div>
      </div>) : <div className="empty">No database records found.</div>}
      <div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /> Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next <ChevronRight /></button></div>
    </div>
    {open && <DataModal type={type} item={editing} blank={blank} onClose={() => setOpen(false)} onSave={save} />}
    {viewing && <DetailsModal type={type} item={viewing} onClose={() => setViewing(null)} />}
  </div>;
}

function DetailsModal({ type, item, onClose }) {
  const patient = type === 'patients' ? item : item.patient;
  return <div className="modal-backdrop"><article className="modal details-modal" role="dialog" aria-modal="true" aria-label={`${type === 'patients' ? 'Patient' : 'Medical record'} details`}>
    <button type="button" className="modal-x" onClick={onClose}><X /></button>
    <div className="eyebrow">Read-only clinic record</div>
    <h2>{type === 'patients' ? 'Patient details' : 'Medical record'}</h2>
    <section><h3>Patient information</h3><dl className="details-grid">
      <div><dt>Full name</dt><dd>{patient ? `${patient.firstName} ${patient.lastName}` : 'Deleted patient'}</dd></div>
      <div><dt>Email</dt><dd>{show(patient?.email)}</dd></div>
      <div><dt>Phone</dt><dd>{show(patient?.phone)}</dd></div>
      <div><dt>Birth date</dt><dd>{showDate(patient?.birthDate)}</dd></div>
      <div><dt>Sex</dt><dd>{show(patient?.sex)}</dd></div>
      <div className="details-wide"><dt>Address</dt><dd>{show(patient?.address)}</dd></div>
      {type === 'patients' && <div className="details-wide"><dt>Assigned doctor</dt><dd>{patient?.assignedDoctors?.length ? patient.assignedDoctors.map(doctor => `${doctor.name}${doctor.specialty ? ` — ${doctor.specialty}` : ''}`).join(', ') : '—'}</dd></div>}
    </dl></section>
    {type === 'records' && <section className="clinical-details"><h3>Clinical information</h3><dl className="details-grid">
      <div><dt>Visit date</dt><dd>{showDate(item.visitDate)}</dd></div>
      <div><dt>Assigned doctor</dt><dd>{show(item.doctor?.name)}</dd></div>
      <div className="details-wide"><dt>Specialty</dt><dd>{show(item.doctor?.specialty)}</dd></div>
      <div className="details-wide"><dt>Diagnosis</dt><dd>{show(item.diagnosis)}</dd></div>
      <div className="details-wide"><dt>Treatment</dt><dd>{show(item.treatment)}</dd></div>
      <div className="details-wide"><dt>Clinical notes</dt><dd>{show(item.notes)}</dd></div>
    </dl></section>}
    <button className="primary full" onClick={onClose}>Close details</button>
  </article></div>;
}

function DataModal({ type, item, blank, onClose, onSave }) {
  const normalize = () => {
    if (!item) return blank;
    if (type === 'patients') return { firstName: item.firstName, lastName: item.lastName, email: item.email || '', phone: item.phone, birthDate: new Date(item.birthDate).toISOString().slice(0, 10), sex: item.sex, address: item.address || '' };
    return { patient: item.patient?._id || '', doctor: item.doctor?._id || '', visitDate: new Date(item.visitDate).toISOString().slice(0, 10), diagnosis: item.diagnosis, treatment: item.treatment, notes: item.notes || '' };
  };
  const [form, setForm] = useState(normalize), [patients, setPatients] = useState([]), [doctors, setDoctors] = useState([]), [error, setError] = useState('');
  useEffect(() => { if (type === 'records') Promise.all([api.get('/patients', { params: { limit: 50 } }), api.get('/doctors')]).then(([p, d]) => { setPatients(p.data.data); setDoctors(d.data); }); }, [type]);
  const field = (key, label, props = {}) => <label>{label}<input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={props.required !== false} {...props} /></label>;
  const submit = async e => { e.preventDefault(); try { await onSave(form); } catch (e) { setError(e.response?.data?.errors?.[0]?.msg || 'Unable to save record.'); } };
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><button type="button" className="modal-x" onClick={onClose}><X /></button><div className="eyebrow">{item ? 'Update' : 'Create'} database record</div><h2>{item ? 'Edit' : 'Add'} {type === 'patients' ? 'patient' : 'medical record'}</h2>
    {type === 'patients' ? <>{field('firstName', 'First name')}{field('lastName', 'Last name')}<div className="form-row">{field('email', 'Email', { type: 'email', required: false })}{field('phone', 'Phone')}</div><div className="form-row">{field('birthDate', 'Birth date', { type: 'date' })}<label>Sex<select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}><option>Female</option><option>Male</option><option>Other</option></select></label></div>{field('address', 'Address', { required: false })}</> : <><label>Patient<select value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })} required><option value="">Select patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>)}</select></label><label>Doctor<select value={form.doctor} onChange={e => setForm({ ...form, doctor: e.target.value })} required><option value="">Select doctor</option>{doctors.map(d => <option key={d._id} value={d._id}>{d.name} — {d.specialty}</option>)}</select></label>{field('visitDate', 'Visit date', { type: 'date' })}{field('diagnosis', 'Diagnosis')}{field('treatment', 'Treatment')}{field('notes', 'Notes', { required: false })}</>}
    {error && <div className="form-error">{error}</div>}<button className="primary full">Save record</button></form></div>;
}
