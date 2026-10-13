import { useEffect, useState } from "react";

// Keeps the public staff entry point hidden until the clinic's keyboard cue is entered.
export default function useStaffSignInReveal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let keys = "";
    let timer;
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      keys = `${keys}${event.key}`.slice(-4).toUpperCase();
      clearTimeout(timer);
      timer = setTimeout(() => { keys = ""; }, 1500);
      if (keys === "CARE") {
        setVisible(true);
        keys = "";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, []);

  return visible;
}
