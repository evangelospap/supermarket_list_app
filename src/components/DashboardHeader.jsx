const NAV_ITEMS = [
  { countKey: "needed", label: "Χρειάζομαι", view: "needed" },
  { countKey: "have", label: "Έχω σπίτι", view: "have" },
  { countKey: "notNeeded", label: "Δεν το θέλω", view: "notNeeded" },
  { countKey: "all", label: "Όλα", view: "all" },
];

export function DashboardHeader({
  activeHouseholdId,
  authNotice,
  households,
  onCreateHousehold,
  onJoinHousehold,
  onLogout,
  onOpenCart,
  onRotateInvite,
  onSwitchHousehold,
  onViewChange,
  totals,
  user,
  view,
}) {
  const activeHousehold = households.find((household) => household.id === activeHouseholdId);

  return (
    <>
      <section className="hero">
        <div className="title-block">
          <p className="eyebrow">Supermarket GUI</p>
          <h2>{activeHousehold?.name ?? "Λίστα supermarket"}</h2>
          <p className="dashboard-note">Γρήγορη εικόνα αποθέματος, αγορών και σπιτιού.</p>
        </div>

        <div className="household-toolbar" aria-label="Σπίτια και λογαριασμός">
          <label>
            <span>Σπίτι</span>
            <select value={activeHouseholdId} onChange={(event) => onSwitchHousehold(event.target.value)}>
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </label>
          <div className="household-actions">
            <button type="button" onClick={onCreateHousehold}>
              Νέο
            </button>
            <button type="button" onClick={onJoinHousehold}>
              Join
            </button>
            <button type="button" onClick={onRotateInvite}>
              Κωδικός
            </button>
            <button type="button" onClick={onLogout}>
              Έξοδος
            </button>
          </div>
          <small>{user?.displayName}</small>
          {authNotice ? <p>{authNotice}</p> : null}
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
