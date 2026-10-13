import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import doctorHero from "../assets/doctor-hero.png";
import aboutClinic from "../assets/public/about-clinic.png";
import privacyRecords from "../assets/public/privacy-records.png";
import useStaffSignInReveal from "../hooks/useStaffSignInReveal";

export default function WelcomePage() {
  const [activeSection, setActiveSection] = useState("home");
  const showStaffSignIn = useStaffSignInReveal();
  useEffect(() => {
    // Keep this in visual page order, not navbar order, so the active link
    // always reflects the section currently under the sticky header.
    const sectionIds = ["how-it-works", "mission-vision", "about-us", "privacy-policy"];
    const updateActiveSection = () => {
      const current = sectionIds.reduce((active, id) => {
        const section = document.getElementById(id);
        return section && section.offsetTop <= window.scrollY + 150 ? id : active;
      }, "home");
      setActiveSection(current);
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, []);
  const navigateToSection = section => event => {
    event.preventDefault();
    setActiveSection(section);
    if (section === "home") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", section === "home" ? "/" : `#${section}`);
  };

  return <main className="public-page">
    <header className="public-nav">
      <Link className="public-brand" to="/" onClick={navigateToSection("home")}><HeartPulse /> CLARA <em>care</em></Link>
      <nav className="floating-nav" aria-label="ClaraCare sections">
        <a className={activeSection === "home" ? "active" : ""} href="/" onClick={navigateToSection("home")}>Home</a>
        <a className={activeSection === "mission-vision" ? "active" : ""} href="#mission-vision" onClick={navigateToSection("mission-vision")}>Mission &amp; Vision</a>
        <a className={activeSection === "how-it-works" ? "active" : ""} href="#how-it-works" onClick={navigateToSection("how-it-works")}>How it works</a>
        <a className={activeSection === "about-us" ? "active" : ""} href="#about-us" onClick={navigateToSection("about-us")}>About us</a>
        <a className={activeSection === "privacy-policy" ? "active" : ""} href="#privacy-policy" onClick={navigateToSection("privacy-policy")}>Privacy policy</a>
      </nav>
    </header>
    <section className="public-hero">
      <div className="public-hero-copy">
        <p className="eyebrow">MULTI-SPECIALTY MEDICAL CLINIC</p>
        <h1>Healthcare designed around you</h1>
        <div className="hero-actions">
          <Link className="primary" to="/appointment">Book an appointment</Link>
          {showStaffSignIn && <Link className="secondary" to="/login">Staff sign in</Link>}
        </div>
        <p className="hero-copy">From routine checkups to specialized treatment, ClaraCare brings experienced physicians and coordinated care together under one roof.</p>
      </div>
      <div className="public-doctor" aria-hidden="true">
        <img src={doctorHero} alt="" />
      </div>
      <aside className="hero-card" aria-hidden="true">
        <article><strong>20K+</strong><span>Patients served successfully</span></article>
        <article><strong>30+</strong><span>Board-certified specialists</span></article>
        <article><strong>18</strong><span>Medical departments</span></article>
        <article><strong>4.9/5</strong><span>Average patient satisfaction</span></article>
      </aside>
    </section>
    <section id="how-it-works" className="care-steps">
      <article><CalendarDays /><h2>1. Send a request</h2><p>Share your details, preferred date, and reason for visiting.</p></article>
      <article><Stethoscope /><h2>2. We review it</h2><p>Our staff checks availability and prepares your appointment.</p></article>
      <article><ShieldCheck /><h2>3. Get confirmation</h2><p>We contact you using the phone number or email you provide.</p></article>
    </section>
    <section id="mission-vision" className="public-info-section mission-vision-section">
      <article>
        <p className="eyebrow">Our mission</p>
        <h2>Make coordinated healthcare easier to reach.</h2>
        <p>ClaraCare helps patients request care quickly while giving clinic teams a clear, organized path to review appointments, prepare visits, and keep records moving.</p>
      </article>
      <article>
        <p className="eyebrow">Our vision</p>
        <h2>A calmer clinic experience for every patient and care team.</h2>
        <p>We aim to support clinics with simple digital workflows that reduce confusion, improve response times, and keep patient care connected from request to confirmation.</p>
      </article>
    </section>
    <section id="about-us" className="public-info-section info-with-image">
      <div className="info-copy">
        <p className="eyebrow">About us</p>
        <h2>Built around practical clinic coordination.</h2>
        <p>ClaraCare is designed for the everyday work that keeps a clinic connected: appointment requests, doctor schedules, patient records, and the small details that help each clinic day run smoothly. We bring these essential tasks into one easy-to-use system so patients can request care with confidence and clinic teams can spend less time tracking information across messages, paper forms, and separate tools. From the first appointment request through follow-up care, ClaraCare supports a more organized, responsive, and welcoming experience for everyone involved.</p>
      </div>
      <figure className="info-visual"><img src={aboutClinic} alt="Doctor helping a patient at a clinic reception" /></figure>
    </section>
    <section id="privacy-policy" className="public-info-section info-with-image">
      <div className="info-copy">
        <p className="eyebrow">Privacy policy</p>
        <h2>Your information is handled with care.</h2>
        <p>We collect the information needed to process appointment requests, contact patients about their visit, and help authorized clinic staff coordinate care. This may include your name, contact details, preferred appointment time, and the reason for your visit. Access to patient information should be limited to authorized staff who need it for care coordination, appointment management, or approved administrative work. ClaraCare is intended to help clinics handle this information more consistently and responsibly; patients should contact the clinic directly if they have questions about how their information is used, updated, or retained.</p>
      </div>
      <figure className="info-visual"><img src={privacyRecords} alt="Secure digital medical record protected by a shield" /></figure>
    </section>
  </main>;
}
