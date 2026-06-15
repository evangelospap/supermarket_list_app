import { useEffect, useState } from "react";

export function ScrollTopButton({ threshold = 260 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > threshold);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    document.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    window.addEventListener("focus", updateVisibility);
    window.visualViewport?.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      document.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
      window.removeEventListener("focus", updateVisibility);
      window.visualViewport?.removeEventListener("scroll", updateVisibility);
    };
  }, [threshold]);

  if (!visible) {
    return null;
  }

  return (
    <button
      className="scroll-top-button"
      type="button"
      onClick={() => window.scrollTo({ behavior: "smooth", top: 0 })}
      aria-label="Πήγαινε στην κορυφή"
    >
      ↑
    </button>
  );
}
