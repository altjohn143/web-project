import { useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import api from "../api";

const careOptions = [
  "General medicine",
  "Internal medicine",
  "Pediatrics",
  "Women's health",
];
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryOptions = getCountries().map(country => ({
  country,
  code: `+${getCountryCallingCode(country)}`,
  name: countryNames.of(country),
})).sort((a, b) => a.name.localeCompare(b.name));
const officeTimeSlots = Array.from({ length: 19 }, (_, index) => {
  const minutesAfterOpening = index * 30;
  const hour = 8 + Math.floor(minutesAfterOpening / 60);
  const minute = minutesAfterOpening % 60;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const displayHour = hour % 12 || 12;
  return { value, label: `${displayHour}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}` };
});

const initialForm = {
  firstName: "", middleName: "", lastName: "", country: "PH", phone: "",
  email: "", careType: "", date: "", time: "",
};

function isOfficeHours(value) {
  if (!value) return true;
  const selected = new Date(value);
  const day = selected.getDay();
  const hour = selected.getHours();
  return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
}

export default function PatientAppointmentPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [code, setCode] = useState("");
  const selectedCountry = countryOptions.find(option => option.country === form.country);
  const isPhilippineNumber = form.country === "PH";
  const today = new Date().toLocaleDateString("en-CA");

  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    setError("");
    const appointmentDateTime = form.date && form.time ? `${form.date}T${form.time}` : "";
    if (!isOfficeHours(appointmentDateTime)) {
      setError("Please choose a weekday appointment between 8:00 AM and 5:00 PM.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/appointments/public/send-otp", { ...form, date: appointmentDateTime, countryCode: selectedCountry.code });
      setVerificationId(data.verificationId);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "We couldn't send your verification code. Please try again.");
    } finally { setBusy(false); }
  };
  const verify = async e => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/appointments/public/verify-otp", { verificationId, code });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "We couldn't verify that code. Please try again.");
    } finally { setBusy(false); }
  };

  return <main className="public-page appointment-page">
    <nav className="public-nav"><Link className="public-brand" to="/"><HeartPulse /> CLARA <em>care</em></Link><Link className="staff-link" to="/login">Staff sign in</Link></nav>
    <section className="appointment-layout">
      <div className="appointment-intro"><p className="eyebrow">PATIENT APPOINTMENTS</p><h1>Let’s arrange your <em>visit.</em></h1><p>You do not need an account. Send your request and our staff will confirm the time.</p><Link to="/">Back to home</Link></div>
      <form className="patient-form" onSubmit={verificationId ? verify : submit}>
        {success ? <div className="request-success"><h2>Request received.</h2><p>Thank you. ClaraCare will contact you soon to confirm your appointment.</p><Link className="primary" to="/">Return to home</Link></div>
          : verificationId ? <>
            <h2>Check your email</h2><p className="verification-copy">We sent a six-digit verification code to <strong>{form.email}</strong>. Enter it below to submit your request.</p>
            <label>Verification code<input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength="6" pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" required /></label>
            {error && <div className="form-error">{error}</div>}<button className="primary full" disabled={busy || code.length !== 6}>{busy ? "Verifying..." : "Verify email and submit"}</button><button className="text-button" type="button" onClick={() => { setVerificationId(""); setCode(""); setError(""); }}>Use a different email or edit request</button><p className="form-note">The code expires in 10 minutes.</p>
          </> : <>
            <h2>Appointment request</h2>
            <div className="form-row name-row">
              <label>First name<input name="firstName" value={form.firstName} onChange={update} autoComplete="given-name" minLength="2" maxLength="50" required /></label>
              <label><span>Middle name <em className="optional-label">Optional</em></span><input name="middleName" value={form.middleName} onChange={update} autoComplete="additional-name" maxLength="50" /></label>
              <label>Last name<input name="lastName" value={form.lastName} onChange={update} autoComplete="family-name" minLength="2" maxLength="50" required /></label>
            </div>
            <div className="form-row contact-row">
              <label>Phone number<small>{isPhilippineNumber ? "Philippine mobile number" : "Enter 7 to 15 digits"}</small><div className="phone-fields"><select name="country" value={form.country} onChange={update} aria-label="Country">{countryOptions.map(option => <option key={option.country} value={option.country}>{option.country} {option.code}</option>)}</select><input name="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} inputMode="numeric" autoComplete="tel-national" pattern={isPhilippineNumber ? "9[0-9]{9}" : "[0-9]{7,15}"} title={isPhilippineNumber ? "Enter 10 digits starting with 9, for example 9123456789." : "Enter 7 to 15 digits."} placeholder={isPhilippineNumber ? "9123456789" : "Phone number"} maxLength={isPhilippineNumber ? "10" : "15"} required /></div></label>
              <label>Email address <small>We’ll verify this before submitting your request.</small><input name="email" type="email" value={form.email} onChange={update} autoComplete="email" inputMode="email" title="Enter a valid email address, including @." required /></label>
            </div>
            <div className="form-row schedule-row">
              <label>Preferred date<small>Monday–Friday only</small><input name="date" type="date" min={today} value={form.date} onChange={update} required /></label>
              <label>Preferred time<small>Clinic hours: 8:00 AM–5:00 PM</small><select name="time" value={form.time} onChange={update} required><option value="">Select a clinic time</option>{officeTimeSlots.map(slot => <option key={slot.value} value={slot.value}>{slot.label}</option>)}</select></label>
              <label>What can we help you with?<small>We’ll assign the right practitioner automatically.</small><select name="careType" value={form.careType} onChange={update} required><option value="">Select a type of care</option>{careOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
            </div>
            {error && <div className="form-error">{error}</div>}<button className="primary full" disabled={busy}>{busy ? "Sending code..." : "Send verification code"}</button><p className="form-note">We’ll email a verification code before your request is submitted.</p>
          </>}
      </form>
    </section>
  </main>;
}
