import { useEffect } from "react";

// Keeps visible data current without reloading the page or showing notices.
export default function useSilentRefresh(refresh, interval = 10000) {
  useEffect(() => {
    const update = () => document.visibilityState === "visible" && refresh();
    const timer = setInterval(update, interval);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh, interval]);
}
