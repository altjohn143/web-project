const brevoApiKey = process.env.BREVO_API_KEY;
const sender = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || 'ClaraCare';
const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

async function sendEmail(message) {
  if (!brevoApiKey || !sender) throw Object.assign(new Error('Email service is not configured.'), { status: 503 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const recipients = (Array.isArray(message.to) ? message.to : [message.to]).map(email => ({ email }));
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': brevoApiKey },
      body: JSON.stringify({ sender: { name: senderName, email: sender }, to: recipients, subject: message.subject, htmlContent: message.html }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Brevo returned ${response.status}: ${await response.text()}`);
  } catch (error) {
    console.error('Brevo email error:', error.message);
    throw Object.assign(new Error('We could not send the email. Please try again.'), { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendAppointmentOtp(email, code) {
  return sendEmail({
    to: [email],
    subject: 'Your ClaraCare verification code',
    html: `<main style="font-family:Arial,sans-serif;color:#24312d"><h1>Verify your appointment request</h1><p>Your ClaraCare verification code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p></main>`,
  });
}

async function sendAppointmentConfirmation(appointment) {
  const appointmentDate = new Date(appointment.date).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Manila' });
  return sendEmail({
    to: [appointment.email],
    subject: 'Your ClaraCare appointment is confirmed',
    html: `<main style="font-family:Arial,sans-serif;color:#24312d"><h1>Your appointment is confirmed</h1><p>Hello ${escapeHtml(appointment.patient)},</p><p>Your appointment with ClaraCare has been confirmed.</p><p><strong>Date and time:</strong> ${escapeHtml(appointmentDate)}<br/><strong>Doctor:</strong> ${escapeHtml(appointment.doctor)}</p><p>Please contact the clinic if you need to make a change.</p></main>`,
  });
}

module.exports = { sendAppointmentOtp, sendAppointmentConfirmation };
