import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import api from './api';
import { useAuth } from './AuthContext';

const patientName = patient => patient ? patient.firstName + ' ' + patient.lastName : 'Deleted patient';
const receipt = invoice => {
  const popup = window.open('', '_blank', 'width=720,height=820');
  popup.document.write('<!doctype html><title>ClaraCare Receipt</title><h1>CLARA care</h1><p>Official payment receipt</p><p><b>Patient:</b> ' + patientName(invoice.patient) + '</p><p><b>Description:</b> ' + invoice.description + '</p><p><b>Amount paid:</b> ₱' + Number(invoice.amountPaid || invoice.amount).toFixed(2) + '</p><script>print()</script>');
  popup.document.close();
};

function PaymentModal({ invoice, close, save }) {
  const initial = { ...invoice, amount: invoice.subtotal || invoice.amount, dueDate: new Date(invoice.dueDate).toISOString().slice(0, 10) };
  const [amount, setAmount] = useState(initial.amount || 0), [discount, setDiscount] = useState(initial.discountType || 'None');
  const subtotal = Number(amount) || 0, discountAmount = discount === 'None' ? 0 : subtotal * .2, due = (subtotal - discountAmount).toFixed(2);
  return createPortal(<div className="modal-backdrop"><form className="modal workflow-modal operation-modal" onSubmit={save}>
    <button type="button" className="modal-x" onClick={close}><X /></button><div className="eyebrow">ClaraCare billing</div><h2>Register payment</h2>
    <label>Patient<input value={patientName(invoice.patient)} disabled /></label><label>Description<input name="description" defaultValue={initial.description} required /></label>
    <div className="form-row"><label>Subtotal<input name="amount" type="number" min="0.01" step=".01" defaultValue={initial.amount} onChange={event => setAmount(event.target.value)} required /></label><label>Amount paid<input value={due} disabled /><input name="amountPaid" value={due} readOnly hidden /></label></div>
    <div className="form-row"><label>Discount<select name="discountType" value={discount} onChange={event => setDiscount(event.target.value)}>{['None', 'Senior Citizen', 'PWD'].map(value => <option key={value}>{value}</option>)}</select></label><label>Payment method<select name="paymentMethod" defaultValue={initial.paymentMethod}>{['Cash', 'Card', 'GCash', 'Bank transfer', 'Other'].map(value => <option key={value}>{value}</option>)}</select></label></div>
    <label>Due date<input name="dueDate" type="date" defaultValue={initial.dueDate} required /></label><button className="primary full">Register payment</button>
  </form></div>, document.body);
}

export function BillingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]), [open, setOpen] = useState(false), [selected, setSelected] = useState(null), [error, setError] = useState(''), [page, setPage] = useState(1), [pages, setPages] = useState(1), [query, setQuery] = useState('');
  const load = useCallback(() => api.get('/billing', { params: { page, limit: 8, q: query.trim() || undefined } }).then(response => { setItems(response.data.data); setPages(response.data.pages); setError(''); }).catch(response => setError(response.response?.data?.message || 'Unable to load billing records.')), [page, query]);
  useEffect(() => { load(); }, [load]);
  const save = async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); data.amountPaid = +data.amountPaid; try { await api.put('/billing/' + selected._id, data); setOpen(false); setSelected(null); load(); } catch (response) { setError(response.response?.data?.message || response.response?.data?.errors?.[0]?.msg || 'Unable to register payment.'); } };
  return <div className="page operations-page"><section className="subhero"><h1>Billing,<br /><em>organized.</em></h1></section>{error && <div className="form-error">{error}</div>}
    <div className="module-search"><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search by patient, description, or payment status..." aria-label="Search billing records" /><span>{items.length} matching records</span></div>
    <div className="data-table billing-table-wrap"><table className="billing-table"><thead><tr><th>Patient</th><th>Description</th><th>Amount due</th><th>Payment method</th><th>Discount</th><th>Amount paid</th><th>UNPAID</th><th>PAID</th><th>Actions</th></tr></thead><tbody>{items.map(invoice => <tr key={invoice._id}><td>{patientName(invoice.patient)}</td><td>{invoice.description}</td><td>₱{Number(invoice.amount).toFixed(2)}</td><td>{invoice.paymentMethod || '—'}</td><td>{invoice.discountType && invoice.discountType !== 'None' ? invoice.discountType : 'None'}</td><td>{invoice.status === 'Paid' ? '₱' + Number(invoice.amountPaid).toFixed(2) : '—'}</td><td>{invoice.status === 'Unpaid' && <span className="status unpaid">UNPAID</span>}</td><td>{invoice.status === 'Paid' && <span className="status paid">PAID</span>}</td><td>{invoice.status === 'Paid' ? <button onClick={() => receipt(invoice)}>View receipt</button> : user.role === 'billing' && <button onClick={() => { setSelected(invoice); setOpen(true); }}>Register payment</button>}</td></tr>)}</tbody></table><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
    {open && <PaymentModal invoice={selected} close={() => { setOpen(false); setSelected(null); }} save={save} />}</div>;
}
