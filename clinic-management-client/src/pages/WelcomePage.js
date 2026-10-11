import { Link } from "react-router-dom";
import { CalendarDays, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";

export default function WelcomePage() {
  return <main className="public-page">
    <nav className="public-nav">
      <Link className="public-brand" to="/"><HeartPulse /> CLARA <em>care</em></Link>
      <Link className="staff-link" to="/login">Staff sign in &rarr;</Link>
    </nav>
    <section className="public-hero">
      <div>
        <p className="eyebrow">YOUR CARE, MADE SIMPLE</p>
        <h1>Health support that starts with a <em>hello.</em></h1>
        <p className="hero-copy">Request an appointment with ClaraCare in a few minutes. No patient account, password, or app download required.</p>
        <div className="hero-actions"><Link className="primary" to="/appointment">Request an appointment <span>&rarr;</span></Link><a href="#how-it-works">How it works</a></div>
      </div>
      <aside className="hero-card">
        <span className="hero-icon"><CalendarDays /></span><p>Appointments are reviewed by our clinic team.</p><strong>We’ll contact you to confirm your visit.</strong>
      </aside>
    </section>
    <section id="how-it-works" className="care-steps">
      <article><CalendarDays /><h2>1. Send a request</h2><p>Share your details, preferred date, and reason for visiting.</p></article>
      <article><Stethoscope /><h2>2. We review it</h2><p>Our staff checks availability and prepares your appointment.</p></article>
      <article><ShieldCheck /><h2>3. Get confirmation</h2><p>We contact you using the phone number or email you provide.</p></article>
    </section>
  </main>;
}
