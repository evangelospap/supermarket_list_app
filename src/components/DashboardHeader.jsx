export function DashboardHeader({ onOpenCart, onViewChange, totals, view }) {
  return (
    <>
      <section className="hero">
        <div className="title-block">
          <p className="eyebrow">Supermarket GUI</p>
          <h2>Λίστα supermarket που ξεχωρίζει τι έχεις και τι χρειάζεσαι.</h2>
          <p className="dashboard-note">Dashboard αγορών με έξυπνες κατηγορίες και καθαρή εικόνα αποθέματος.</p>
        </div>
      </section>

      <section className="summary-bar" aria-label="Σύνοψη και γρήγορα φίλτρα">
        <div className="stats">
          <button
            aria-pressed={view === "needed"}
            className={`stat-card ${view === "needed" ? "active" : ""}`}
            type="button"
            onClick={() => onViewChange("needed")}
          >
            <small>Χρειάζομαι</small>
            <strong>{totals.needed}</strong>
          </button>
          <button
            aria-pressed={view === "notNeeded"}
            className={`stat-card ${view === "notNeeded" ? "active" : ""}`}
            type="button"
            onClick={() => onViewChange("notNeeded")}
          >
            <small>Δεν το χρειάζομαι</small>
            <strong>{totals.notNeeded}</strong>
          </button>
          <button
            aria-pressed={view === "have"}
            className={`stat-card ${view === "have" ? "active" : ""}`}
            type="button"
            onClick={() => onViewChange("have")}
          >
            <small>Έχω σπίτι</small>
            <strong>{totals.have}</strong>
          </button>
          <button
            aria-pressed={view === "all"}
            className={`stat-card total-card ${view === "all" ? "active" : ""}`}
            type="button"
            onClick={() => onViewChange("all")}
          >
            <small>Σύνολο</small>
            <strong>{totals.all}</strong>
          </button>
          <button className="shopping-nav-button" type="button" onClick={onOpenCart} aria-label="Πάμε σούπερ!">
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
            <span className="shopping-nav-label">Πάμε σούπερ!</span>
          </button>
        </div>
      </section>
    </>
  );
}
