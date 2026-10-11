import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./pages/AuthPage";
import WelcomePage from "./pages/WelcomePage";
import PatientAppointmentPage from "./pages/PatientAppointmentPage";
import ClinicShell from "./layouts/ClinicShell";
import "./App.css";

function Protected({ children }) {
  return useAuth().user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/" element={<WelcomePage />} />
    <Route path="/appointment" element={<PatientAppointmentPage />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/*" element={<Protected><ClinicShell /></Protected>} />
  </Routes></BrowserRouter></AuthProvider>;
}
