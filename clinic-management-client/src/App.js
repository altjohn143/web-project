import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./pages/AuthPage";
import WelcomePage from "./pages/WelcomePage";
import PatientAppointmentPage from "./pages/PatientAppointmentPage";
import ClinicShell from "./layouts/ClinicShell";
import "./App.css";

function Protected({ children }) {
  return useAuth().user ? children : <Navigate to="/login" replace />;
}

function RouteTransition({ children }) {
  const location = useLocation();
  return <div className="route-transition" key={location.pathname}>{children}</div>;
}

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/" element={<RouteTransition><WelcomePage /></RouteTransition>} />
    <Route path="/appointment" element={<RouteTransition><PatientAppointmentPage /></RouteTransition>} />
    <Route path="/login" element={<RouteTransition><AuthPage /></RouteTransition>} />
    <Route path="/*" element={<Protected><ClinicShell /></Protected>} />
  </Routes></BrowserRouter></AuthProvider>;
}
