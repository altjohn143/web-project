import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-input">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </span>
  );
}

