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
const clockHours = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5];

const formatTime = value => officeTimeSlots.find(slot => slot.value === value)?.label || "Choose a time";
const pointForAngle = (angle, radius) => {
  const radians = angle * Math.PI / 180;
  return { x: 110 + radius * Math.sin(radians), y: 110 - radius * Math.cos(radians) };
};

function AnalogTimePicker({ value, onChange }) {
  const [dragging, setDragging] = useState("");
  const [selectedHour, selectedMinute] = value ? value.split(":").map(Number) : [8, 0];
  const minuteAngle = selectedMinute * 6;
  const hourAngle = (selectedHour % 12) * 30 + selectedMinute * .5;
  const hourPoint = pointForAngle(hourAngle, 51);
  const minutePoint = pointForAngle(minuteAngle, 74);

  const updateFromPointer = (event, hand) => {
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const angle = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
    let hour = selectedHour;
    let minute = selectedMinute;

    if (hand === "hour") {
      const target = Math.round(angle / 30) % 12 || 12;
      const closestHour = clockHours.reduce((closest, candidate) => {
        const distance = Math.abs(candidate - target);
        const wrappedDistance = Math.min(distance, 12 - distance);
        const currentDistance = Math.abs(closest - target);
        return wrappedDistance < Math.min(currentDistance, 12 - currentDistance) ? candidate : closest;
      }, clockHours[0]);
      hour = closestHour >= 8 ? closestHour : closestHour + 12;
    } else {
      minute = Math.round(angle / 180) * 30 % 60;
    }
    onChange(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  const beginDrag = (event, hand) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(hand);
    updateFromPointer(event, hand);
  };

  return <fieldset className="time-slot-picker analog-time-picker">
    <legend>Preferred time <small>Clinic hours: 8:00 AM–5:00 PM</small></legend>
    <p className="clock-instruction">Drag the short hand for the hour and the long hand for :00 or :30.</p>
    <div className="clock-selection" aria-live="polite">{formatTime(value)}</div>
    <svg className="time-clock" viewBox="0 0 220 220" role="group" aria-label="Interactive appointment clock">
      <circle className="clock-face" cx="110" cy="110" r="98" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * 30;
        const start = pointForAngle(angle, 84);
        const end = pointForAngle(angle, index % 3 === 0 ? 92 : 89);
        return <line key={index} className={index % 3 === 0 ? "clock-tick major" : "clock-tick"} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
      })}
      {clockHours.map(hour => {
        const point = pointForAngle((hour % 12) * 30, 72);
        return <text key={hour} className="clock-number" x={point.x} y={point.y + 4} textAnchor="middle">{hour}</text>;
      })}
      <line className={`clock-hand hour-hand ${dragging === "hour" ? "dragging" : ""}`} x1="110" y1="110" x2={hourPoint.x} y2={hourPoint.y} />
      <line className={`clock-hand minute-hand ${dragging === "minute" ? "dragging" : ""}`} x1="110" y1="110" x2={minutePoint.x} y2={minutePoint.y} />
      <circle className="clock-center" cx="110" cy="110" r="7" />
      <circle className="clock-handle hour-handle" cx={hourPoint.x} cy={hourPoint.y} r="12" role="slider" aria-label="Appointment hour" aria-valuetext={formatTime(`${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`)} tabIndex="0" onPointerDown={event => beginDrag(event, "hour")} onPointerMove={event => dragging === "hour" && updateFromPointer(event, "hour")} onPointerUp={() => setDragging("")} onPointerCancel={() => setDragging("")} />
      <circle className="clock-handle minute-handle" cx={minutePoint.x} cy={minutePoint.y} r="11" role="slider" aria-label="Appointment minutes" aria-valuetext={selectedMinute === 0 ? "zero minutes" : "thirty minutes"} tabIndex="0" onPointerDown={event => beginDrag(event, "minute")} onPointerMove={event => dragging === "minute" && updateFromPointer(event, "minute")} onPointerUp={() => setDragging("")} onPointerCancel={() => setDragging("")} />
    </svg>
  </fieldset>;
}

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
              <label>What can we help you with?<small>We’ll assign the right practitioner automatically.</small><select name="careType" value={form.careType} onChange={update} required><option value="">Select a type of care</option>{careOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
              <AnalogTimePicker value={form.time} onChange={time => setForm({ ...form, time })} />
            </div>
            {error && <div className="form-error">{error}</div>}<button className="primary full" disabled={busy}>{busy ? "Sending code..." : "Send verification code"}</button><p className="form-note">We’ll email a verification code before your request is submitted.</p>
          </>}
      </form>
    </section>
  </main>;
}
