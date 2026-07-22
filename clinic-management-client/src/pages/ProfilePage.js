import { useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import PasswordInput from "../components/common/PasswordInput";
import { initials, strongPassword } from "../utils/clinic";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name),
    [profileMessage, setProfileMessage] = useState(""),
    [passwords, setPasswords] = useState({
      currentPassword: "",
      newPassword: "",
      confirm: "",
    }),
    [passwordMessage, setPasswordMessage] = useState(""),
    [passwordError, setPasswordError] = useState(false),
    [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put("/auth/profile", { name });
      updateUser(data);
      setProfileMessage("Profile updated.");
    } catch {
      setProfileMessage("Unable to update profile.");
    }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError(false);
    if (!strongPassword.test(passwords.newPassword)) {
      setPasswordError(true);
      return setPasswordMessage(
        "New password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
      );
    }
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError(true);
      return setPasswordMessage("New passwords do not match.");
    }
    try {
      setBusy(true);
      const { data } = await api.put("/auth/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswordMessage(data.message);
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e) {
      setPasswordError(true);
      setPasswordMessage(
        e.response?.data?.message ||
          e.response?.data?.errors?.[0]?.msg ||
          "Unable to change password.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <section className="subhero">
        <div className="eyebrow">
          <span>03</span> User profile
        </div>
        <h1>
          Your clinic
          <br />
          <em>identity.</em>
        </h1>
      </section>
      <div className="profile-grid">
        <form className="profile-form" onSubmit={save}>
          <div className="profile-avatar">{initials(user.name)}</div>
          <div className="eyebrow">Account details</div>
          <label>
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength="2"
              required
            />
          </label>
          <label>
            Email address
            <input value={user.email} disabled />
          </label>
          <label>
            Role
            <input value={user.role} disabled />
          </label>
          {profileMessage && <p>{profileMessage}</p>}
          <button className="primary">Save profile</button>
        </form>
        <form className="profile-form password-form" onSubmit={changePassword}>
          <div className="eyebrow">Account security</div>
          <h2>Change password</h2>
          <p className="password-intro">
            Verify your current password, then choose a new strong password.
          </p>
          <label>
            Current password
            <PasswordInput
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, currentPassword: e.target.value })
              }
              required
            />
          </label>
          <label>
            New password
            <PasswordInput
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
              required
            />
            <small className="password-help">
              8+ characters with uppercase, lowercase, number, and symbol.
            </small>
          </label>
          <label>
            Confirm new password
            <PasswordInput
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              required
            />
          </label>
          {passwordMessage && (
            <p
              className={
                passwordError ? "password-message error" : "password-message"
              }
            >
              {passwordMessage}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
