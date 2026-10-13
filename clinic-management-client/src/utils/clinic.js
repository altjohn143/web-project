export const appointmentBlank = {
  patient: "", email: "", phone: "", birthDate: "", sex: "", address: "",
  reason: "", doctor: "", date: "", status: "Pending", diagnosis: "", treatment: "", notes: "",
};
export const initials = (name) => name?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "PT";
// In a regular-expression literal, \d must use one backslash.  The prior
// double backslash required the characters "\\d" instead of a number.
export const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const medicalSpecialties = ["Family Physicians", "General Practitioners (GPs)", "Internal Medicine Physicians (Internists)", "Pediatricians", "Obstetrician/Gynecologists (OB-GYNs)"];
