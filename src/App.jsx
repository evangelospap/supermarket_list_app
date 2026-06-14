import { useEffect, useMemo, useState } from "react";
import { loadStoredState, saveStoredState } from "./storage";

const DEFAULT_CATEGORIES = [
  "Λαχανικά",
  "Φρούτα",
  "Γαλακτοκομικά",
  "Κρέας / Ψάρια",
  "Αλλαντικά",
  "Ζυμαρικά / Ρύζι",
  "Όσπρια",
  "Δημητριακά / Ψωμί",
  "Καφέδες / Ροφήματα",
  "Ποτά",
  "Σνακ",
  "Σάλτσες / Λάδια",
  "Κατεψυγμένα",
  "Καθαριστικά",
  "Χαρτικά",
  "Προσωπική φροντίδα",
  "Φροντίδα κατοικιδίου",
  "Να μην ξεχάσω",
];

const CATEGORY_ICONS = {
  "Λαχανικά": "🥬",
  "Φρούτα": "🍎",
  "Γαλακτοκομικά": "🥛",
  "Κρέας / Ψάρια": "🥩",
  "Αλλαντικά": "🥓",
  "Ζυμαρικά / Ρύζι": "🍝",
  "Όσπρια": "🫘",
  "Δημητριακά / Ψωμί": "🍞",
  "Καφέδες / Ροφήματα": "☕",
  "Ποτά": "🥤",
  "Σνακ": "🍫",
  "Σάλτσες / Λάδια": "🫒",
  "Κατεψυγμένα": "🧊",
  "Καθαριστικά": "🧽",
  "Χαρτικά": "🧻",
  "Προσωπική φροντίδα": "🧴",
  "Φροντίδα κατοικιδίου": "🐾",
  "Να μην ξεχάσω": "📌",
};

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] ?? "🛒";
}

const CATEGORY_RULES = [
  {
    category: "Λαχανικά",
    keywords: ["ντοματα", "ντοματες", "αγγουρι", "πατατα", "κρεμμυδι", "μαρουλι", "πιπερια", "καροτο", "λάχανο", "λαχανο", "κολοκυθι"],
  },
  {
    category: "Φρούτα",
    keywords: ["μηλο", "μηλα", "μπανανα", "μπανάνες", "πορτοκαλι", "αχλαδι", "λεμονι", "φραουλα", "καρπουζι", "πεπονι", "αβοκαντο"],
  },
  {
    category: "Γαλακτοκομικά",
    keywords: ["γαλα", "τυρι", "γιαουρτι", "φετα", "βουτυρο", "κρεμα γαλακτος", "ανθοτυρο"],
  },
  {
    category: "Κρέας / Ψάρια",
    keywords: ["κοτοπουλο", "κιμας", "μοσχαρι", "χοιρινο", "ψαρι", "σολομος", "γαριδες", "μπριζολες", "αυγα", "αβγα"],
  },
  {
    category: "Αλλαντικά",
    keywords: ["γαλοπουλα", "ζαμπον", "μπεικον", "σαλαμι", "λουκανικο", "παριζα"],
  },
  {
    category: "Ζυμαρικά / Ρύζι",
    keywords: ["μακαρονια", "σπαγγετι", "πενες", "κριθαρακι", "ρυζι", "πλιγουρι", "λαζανια", "νούντλς", "noodles"],
  },
  {
    category: "Όσπρια",
    keywords: ["φακες", "φασολια", "ρεβυθια", "ρεβιθια", "φάβα", "κουκια"],
  },
  {
    category: "Δημητριακά / Ψωμί",
    keywords: ["ψωμι", "τοστ", "δημητριακα", "βρωμη", "φρυγανιες", "κριτσινια", "παξιμαδι"],
  },
  {
    category: "Καφέδες / Ροφήματα",
    keywords: ["καφες", "espresso", "nescafe", "τσαι", "κακαο", "χαμομηλι"],
  },
  {
    category: "Ποτά",
    keywords: ["νερο", "χυμος", "μπυρα", "κρασι", "αναψυκτικο", "σοδα", "ουζο", "ποτο"],
  },
  {
    category: "Σνακ",
    keywords: ["πατατακια", "κρακερ", "μπισκοτα", "σοκολατα", "ξηροι καρποι", "μπαρα", "snack", "τσιπς"],
  },
  {
    category: "Σάλτσες / Λάδια",
    keywords: ["λαδι", "ελαιολαδο", "ξυδι", "κετσαπ", "μουσταρδα", "μαγιονεζα", "σάλτσα", "σαλτσα", "pesto"],
  },
  {
    category: "Κατεψυγμένα",
    keywords: ["κατεψυγ", "αρακα", "σπανακι", "πιτσα", "παγωτο", "fish sticks"],
  },
  {
    category: "Καθαριστικά",
    keywords: ["χλωρινη", "απορρυπαντικο", "καθαριστικο", "σφουγγαρι", "σακουλες", "πιατων", "τζαμια", "πατωμα"],
  },
  {
    category: "Χαρτικά",
    keywords: ["χαρτι", "κουζινας", "υγειας", "χαρτοπετσετες", "αλουμινοχαρτο", "μεμβρανη"],
  },
  {
    category: "Προσωπική φροντίδα",
    keywords: ["σαμπουαν", "οδοντοκρεμα", "σαπουνι", "αφρολουτρο", "σερβιετες", "μπατονετες", "ξυραφακια"],
  },
  {
    category: "Φροντίδα κατοικιδίου",
    keywords: ["γατα", "σκυλος", "τροφη", "αμμος", "pet"],
  },
];

const STARTER_ITEMS = [
  ["ντομάτες", "Λαχανικά"],
  ["πατάτες", "Λαχανικά"],
  ["κρεμμύδια", "Λαχανικά"],
  ["μπανάνες", "Φρούτα"],
  ["μήλα", "Φρούτα"],
  ["γάλα", "Γαλακτοκομικά"],
  ["φέτα", "Γαλακτοκομικά"],
  ["κοτόπουλο", "Κρέας / Ψάρια"],
  ["κιμάς", "Κρέας / Ψάρια"],
  ["μακαρόνια", "Ζυμαρικά / Ρύζι"],
  ["ρύζι", "Ζυμαρικά / Ρύζι"],
  ["φακές", "Όσπρια"],
  ["ψωμί τοστ", "Δημητριακά / Ψωμί"],
  ["καφές", "Καφέδες / Ροφήματα"],
  ["νερό", "Ποτά"],
  ["ελαιόλαδο", "Σάλτσες / Λάδια"],
  ["χαρτί υγείας", "Χαρτικά"],
  ["απορρυπαντικό πλυντηρίου", "Καθαριστικά"],
].map(([name, category], index) => ({
  id: crypto.randomUUID?.() ?? `starter-${index}`,
  name,
  category,
  status: "needed",
  createdAt: Date.now() + index,
}));

function normalizeText(value) {
  return value
    .toLocaleLowerCase("el-GR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function suggestCategory(name) {
  const normalized = normalizeText(name);
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
  );

  return match?.category ?? "Να μην ξεχάσω";
}

function buildInitialState() {
  return {
    categories: DEFAULT_CATEGORIES,
    items: STARTER_ITEMS,
  };
}

function isValidState(value) {
  return (
    value &&
    Array.isArray(value.categories) &&
    Array.isArray(value.items) &&
    value.items.every((item) => item.id && item.name && item.category && item.status)
  );
}

function App() {
  const [state, setState] = useState(buildInitialState);
  const [storageReady, setStorageReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Φόρτωση");
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("auto");
  const [newCategory, setNewCategory] = useState("");
  const [quickAddCategory, setQuickAddCategory] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);

  useEffect(() => {
    let isMounted = true;

    loadStoredState()
      .then((storedResult) => {
        if (!isMounted) {
          return;
        }

        if (isValidState(storedResult?.state)) {
          setState(storedResult.state);
        }

        setStorageReady(true);
        setStorageStatus(
          storedResult?.source === "backend"
            ? "Συνδεδεμένο με βάση"
            : "Τοπικό αντίγραφο",
        );
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setStorageReady(true);
        setStorageStatus("Προσωρινή αποθήκευση");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    let isCurrent = true;

    setStorageStatus("Αποθήκευση...");

    saveStoredState(state)
      .then((storageMode) => {
        if (isCurrent) {
          setStorageStatus(
            storageMode === "backend" ? "Αποθηκεύτηκε στη βάση" : "Τοπική αποθήκευση",
          );
        }
      })
      .catch(() => {
        if (isCurrent) {
          setStorageStatus("Πρόβλημα αποθήκευσης");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [state, storageReady]);

  const guessedCategory = useMemo(() => {
    return draftName ? suggestCategory(draftName) : "Να μην ξεχάσω";
  }, [draftName]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return state.items.filter((item) => {
      const matchesView = view === "all" || item.status === view;
      const matchesSearch =
        normalizeText(item.name).includes(normalizedQuery) ||
        normalizeText(item.category).includes(normalizedQuery);

      return matchesView && matchesSearch;
    });
  }, [query, state.items, view]);

  const itemsByCategory = useMemo(() => {
    return state.categories
      .map((category) => ({
        category,
        items: visibleItems
          .filter((item) => item.category === category)
          .sort((a, b) => a.name.localeCompare(b.name, "el")),
      }))
      .filter((group) => group.items.length > 0);
  }, [state.categories, visibleItems]);

  const totals = useMemo(() => {
    return state.items.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        acc.all += 1;
        return acc;
      },
      { all: 0, needed: 0, have: 0 },
    );
  }, [state.items]);

  function addItem(event) {
    event.preventDefault();

    const name = draftName.trim();
    const customCategory = newCategory.trim();
    const category =
      customCategory || (draftCategory === "auto" ? guessedCategory : draftCategory);

    if (!name || !category) {
      return;
    }

    setState((current) => {
      const categories = current.categories.includes(category)
        ? current.categories
        : [...current.categories, category];

      return {
        categories,
        items: [
          {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${name}`,
            name,
            category,
            status: "needed",
            createdAt: Date.now(),
          },
          ...current.items,
        ],
      };
    });

    setDraftName("");
    setDraftCategory("auto");
    setNewCategory("");
  }

  function addItemToCategory(event, category) {
    event.preventDefault();

    const name = quickAddName.trim();

    if (!name) {
      return;
    }

    setState((current) => ({
      ...current,
      items: [
        {
          id: crypto.randomUUID?.() ?? `${Date.now()}-${name}`,
          name,
          category,
          status: "needed",
          createdAt: Date.now(),
        },
        ...current.items,
      ],
    }));

    setQuickAddCategory("");
    setQuickAddName("");
  }

  function toggleQuickAdd(category) {
    setQuickAddCategory((currentCategory) =>
      currentCategory === category ? "" : category,
    );
    setQuickAddName("");
  }
  function toggleItemStatus(itemId) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? { ...item, status: item.status === "needed" ? "have" : "needed" }
          : item,
      ),
    }));
  }

  function updateItemCategory(itemId, category) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, category } : item,
      ),
    }));
  }

  function requestRemoveItem(item) {
    setPendingDeleteItem(item);
  }

  function confirmRemoveItem() {
    if (!pendingDeleteItem) {
      return;
    }

    setState((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== pendingDeleteItem.id),
    }));
    setPendingDeleteItem(null);
  }

  function clearCompleted() {
    setState((current) => ({
      ...current,
      items: current.items.filter((item) => item.status !== "have"),
    }));
  }

  function resetList() {
    setState(buildInitialState());
    setQuery("");
    setView("all");
    setQuickAddCategory("");
    setQuickAddName("");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="title-block">
          <p className="eyebrow">Supermarket GUI</p>
          <h1>Λίστα supermarket που ξεχωρίζει τι έχεις και τι χρειάζεσαι.</h1>
          <p className="dashboard-note">Dashboard αγορών με έξυπνες κατηγορίες και καθαρή εικόνα αποθέματος.</p>
        </div>
        <div className="stats" aria-label="Σύνοψη λίστας">
          <span className="stat-card">
            <small>Χρειάζομαι</small>
            <strong>{totals.needed}</strong>
          </span>
          <span className="stat-card">
            <small>Έχω σπίτι</small>
            <strong>{totals.have}</strong>
          </span>
          <span className="stat-card">
            <small>Σύνολο</small>
            <strong>{totals.all}</strong>
          </span>
        </div>
      </section>

      <section className="workspace">
        <aside className="controls-panel" aria-label="Προσθήκη και φίλτρα">
          <div className="panel-heading">
            <div>
              <span>Διαχείριση</span>
              <strong>Λίστας</strong>
            </div>
            <em>{storageStatus}</em>
          </div>

          <form className="add-form" onSubmit={addItem}>
            <div className="section-label">Νέο προϊόν</div>
            <label htmlFor="item-name">Πρόσθεσε προϊόν</label>
            <div className="input-row">
              <input
                id="item-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="π.χ. γιαούρτι, ρύζι, χαρτί κουζίνας"
              />
              <button type="submit">Προσθήκη</button>
            </div>

            <label htmlFor="category-select">Κατηγορία</label>
            <select
              id="category-select"
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
            >
              <option value="auto">Έξυπνη επιλογή: {guessedCategory}</option>
              {state.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <label htmlFor="new-category">Ή νέα κατηγορία</label>
            <input
              id="new-category"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="π.χ. BBQ, Μωρό, Γιορτή"
            />
          </form>

          <div className="filter-block">
            <div className="section-label">Αναζήτηση</div>
            <label htmlFor="search">Αναζήτηση</label>
            <input
              id="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ψάξε προϊόν ή κατηγορία"
            />
          </div>

          <div className="segmented" aria-label="Φίλτρο κατάστασης">
            <button
              className={view === "all" ? "active" : ""}
              type="button"
              onClick={() => setView("all")}
            >
              Όλα
            </button>
            <button
              className={view === "needed" ? "active" : ""}
              type="button"
              onClick={() => setView("needed")}
            >
              Χρειάζομαι
            </button>
            <button
              className={view === "have" ? "active" : ""}
              type="button"
              onClick={() => setView("have")}
            >
              Έχω
            </button>
          </div>

          <div className="secondary-actions">
            <button className="secondary-action danger" type="button" onClick={clearCompleted}>
              <span className="button-icon" aria-hidden="true">⊠</span>
              <span>Καθάρισε όσα έχω</span>
            </button>
            <button className="secondary-action" type="button" onClick={resetList}>
              <span className="button-icon" aria-hidden="true">↻</span>
              <span>Reset demo λίστας</span>
            </button>
          </div>
        </aside>

        <section className="list-area" aria-label="Λίστα προϊόντων">
          {itemsByCategory.length === 0 ? (
            <div className="empty-state">
              <h2>Δεν βρέθηκαν προϊόντα.</h2>
              <p>Άλλαξε φίλτρο ή πρόσθεσε κάτι καινούριο από την αριστερή πλευρά.</p>
            </div>
          ) : (
            itemsByCategory.map((group) => (
              <article className="category-card" key={group.category}>
                <header>
                  <div className="category-title">
                    <h2>
                      <span className="category-icon" aria-hidden="true">
                        {getCategoryIcon(group.category)}
                      </span>
                      <span>{group.category}</span>
                    </h2>
                  </div>
                  <div className="category-actions">
                    <button
                      aria-label={`Προσθήκη προϊόντος στην κατηγορία ${group.category}`}
                      className="quick-add-toggle"
                      type="button"
                      onClick={() => toggleQuickAdd(group.category)}
                    >
                      +
                    </button>
                    <span>{group.items.length}</span>
                  </div>
                </header>

                <div className="item-stack">
                  {quickAddCategory === group.category ? (
                    <form
                      className="quick-add-form"
                      onSubmit={(event) => addItemToCategory(event, group.category)}
                    >
                      <input
                        autoFocus
                        aria-label={`Νέο προϊόν για ${group.category}`}
                        value={quickAddName}
                        onChange={(event) => setQuickAddName(event.target.value)}
                        placeholder="Νέο προϊόν"
                      />
                      <button type="submit">+</button>
                    </form>
                  ) : null}

                  {group.items.map((item) => (
                    <div className={`item-row ${item.status}`} key={item.id}>
                      <label className="item-check">
                        <span className="item-name">{item.name}</span>
                        <span className="have-toggle">
                          <span>Το 'χω!</span>
                          <input
                            aria-label={`${item.status === "have" ? "Αφαίρεση από Έχω σπίτι" : "Σήμανση ως Έχω σπίτι"}: ${item.name}`}
                            checked={item.status === "have"}
                            onChange={() => toggleItemStatus(item.id)}
                            type="checkbox"
                          />
                        </span>
                      </label>

                      <select
                        aria-label={`Αλλαγή κατηγορίας για ${item.name}`}
                        value={item.category}
                        onChange={(event) => updateItemCategory(item.id, event.target.value)}
                      >
                        {state.categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>

                      <button
                        aria-label={`Διαγραφή ${item.name}`}
                        className="delete-button"
                        type="button"
                        onClick={() => requestRemoveItem(item)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
      </section>

      {pendingDeleteItem ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPendingDeleteItem(null)}
        >
          <div
            aria-labelledby="delete-modal-title"
            aria-modal="true"
            className="confirm-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="modal-eyebrow">Επιβεβαίωση διαγραφής</p>
            <h2 id="delete-modal-title">Να διαγραφεί αυτό το προϊόν;</h2>
            <p>
              Θέλεις όντως να διαγράψεις το <strong>{pendingDeleteItem.name}</strong> από την
              κατηγορία <strong>{pendingDeleteItem.category}</strong>;
            </p>
            <div className="modal-actions">
              <button type="button" className="modal-secondary" onClick={() => setPendingDeleteItem(null)}>
                Άκυρο
              </button>
              <button type="button" className="modal-danger" onClick={confirmRemoveItem}>
                Διαγραφή
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
