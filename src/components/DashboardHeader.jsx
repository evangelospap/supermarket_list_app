const NAV_ITEMS = [
  { countKey: "needed", label: "Χρειάζομαι", view: "needed" },
  { countKey: "have", label: "Έχω σπίτι", view: "have" },
  { countKey: "notNeeded", label: "Δεν το θέλω", view: "notNeeded" },
  { countKey: "all", label: "Όλα", view: "all" },
];

function getUserInitial(user) {
  return (user?.displayName ?? user?.email ?? "?").trim().charAt(0).toUpperCase() || "?";
}

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
          <h2>{"Λίστα supermarket"}</h2>
          <label className="household-select-pill">
            <span className="household-home-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M4 11.5 12 5l8 6.5" />
                <path d="M6.5 10.5V19h11v-8.5" />
                <path d="M10 19v-5h4v5" />
              </svg>
            </span>
            <span className="visually-hidden">Σπίτι</span>
            <select value={activeHouseholdId} onChange={(event) => onSwitchHousehold(event.target.value)}>
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="household-toolbar" aria-label="Σπίτια και λογαριασμός">
          <div className="household-actions">
            <button aria-label="Νέο σπίτι" title="Νέο σπίτι" type="button" onClick={onCreateHousehold}>
              +
            </button>
            <button aria-label="Join σε σπίτι" title="Join σε σπίτι" type="button" onClick={onJoinHousehold}>
              ↗
            </button>
            <button aria-label="Αλλαγή κωδικού πρόσκλησης" title="Κωδικός πρόσκλησης" type="button" onClick={onRotateInvite}>
              #
            </button>
            <button aria-label="Έξοδος" title="Έξοδος" type="button" onClick={onLogout}>
              ↪
            </button>
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
            <span className="shopping-nav-label">Πάμε Σούπερ!</span>
          </button>
          <div className="user-avatar" title={user?.displayName ?? user?.email ?? "Χρήστης"} aria-label={user?.displayName ?? "Χρήστης"}>
            {getUserInitial(user)}
          </div>
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

        </div>
      </section>
    </>
  );
}
