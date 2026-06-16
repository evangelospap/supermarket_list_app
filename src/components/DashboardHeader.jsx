const NAV_ITEMS = [
  { countKey: "needed", label: "Χρειάζομαι", view: "needed" },
  { countKey: "have", label: "Έχω σπίτι", view: "have" },
  { countKey: "notNeeded", label: "Δεν το θέλω", view: "notNeeded" },
  { countKey: "all", label: "Όλα", view: "all" },
];

export function DashboardHeader({ onOpenCart, onViewChange, totals, view }) {
  return (
    <>
      <section className="hero">
        <div className="title-block">
          <p className="eyebrow">Supermarket GUI</p>
          <h2>Λίστα supermarket που ξεχωρίζει τι έχεις και τι χρειάζεσαι.</h2>
          <p className="dashboard-note">Γρήγορη εικόνα αποθέματος, αγορών και σπιτιού.</p>
        </div>
      </section>

      <section className="summary-bar" aria-label="Σύνοψη και φίλτρα">
        <div className="stats" role="tablist" aria-label="Φίλτρα λίστας">
          <div className="nav-segment-group">
            {NAV_ITEMS.map((item) => (
              <button
                aria-pressed={view === item.view}
                className={`stat-card ${view === item.view ? "active" : ""}`}
                key={item.view}
                type="button"
                onClick={() => onViewChange(item.view)}
              >
                <span>{item.label}</span>
                <strong>{totals[item.countKey]}</strong>
              </button>
            ))}
          </div>

          <button className="shopping-nav-button" type="button" onClick={onOpenCart} aria-label="Άνοιγμα καλαθιού supermarket">
            <span className="shopping-basket-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" focusable="false">
                <path d="M10 13 15 6" />
                <path d="m22 13-5-7" />
                <path d="M6 13h20l-2 13H8L6 13Z" />
                <path d="M11 17v5" />
                <path d="M16 17v5" />
                <path d="M21 17v5" />
              </svg>
            </span>
            <span className="shopping-nav-label">Παμε Σουπερ!</span>
          </button>
        </div>
      </section>
    </>
  );
}
