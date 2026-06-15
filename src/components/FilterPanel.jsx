export function FilterPanel({ query, view, onQueryChange, onViewChange }) {
  return (
    <>
      <div className="filter-block">
        <div className="section-label">Αναζήτηση</div>
        <label htmlFor="search">Αναζήτηση</label>
        <input
          id="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="ψάξε προϊόν ή κατηγορία"
        />
      </div>

      <div className="segmented" aria-label="Φίλτρο κατάστασης">
        <button className={view === "all" ? "active" : ""} type="button" onClick={() => onViewChange("all")}>
          Όλα
        </button>
        <button className={view === "notNeeded" ? "active" : ""} type="button" onClick={() => onViewChange("notNeeded")}>
          Δεν το χρειάζομαι
        </button>
        <button className={view === "needed" ? "active" : ""} type="button" onClick={() => onViewChange("needed")}>
          Χρειάζομαι
        </button>
        <button className={view === "have" ? "active" : ""} type="button" onClick={() => onViewChange("have")}>
          Έχω
        </button>
      </div>
    </>
  );
}
