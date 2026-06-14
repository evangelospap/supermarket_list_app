import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStoredState, lookupProductCode, saveStoredState } from "./storage";

// Core catalogue used for first-run demo data and category ordering.
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

// Small visual hints for scanning category cards quickly.
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

// Keyword rules power the automatic category suggestion while typing a product.
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

// Starter items make a new install immediately usable.
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

const SCANNER_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "code_128"];

// Product QR codes sometimes contain URLs; barcodes are usually the 8-14 digit part.
function normalizeScannedCode(value) {
  const text = String(value ?? "").trim();
  const digitMatch = text.match(/\b\d{8,14}\b/);

  return digitMatch?.[0] ?? text;
}
// Normalization lets search and category suggestions ignore Greek accents/case.
function normalizeText(value) {
  return value
    .toLocaleLowerCase("el-GR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

// Pick the first category whose keyword appears in the typed product name.
function suggestCategory(name) {
  const normalized = normalizeText(name);
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
  );

  return match?.category ?? "Να μην ξεχάσω";
}

// The persisted app state is small enough to validate with a lightweight guard.
function isValidState(value) {
  return (
    value &&
    Array.isArray(value.categories) &&
    Array.isArray(value.items) &&
    value.items.every((item) => item.id && item.name && item.category && item.status)
  );
}

// First-run state is shared by reset and empty storage initialization.
function buildInitialState() {
  return {
    categories: DEFAULT_CATEGORIES,
    items: STARTER_ITEMS,
  };
}

// Category icons fall back gracefully for custom categories.
function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] ?? "🛒";
}

// Header only receives computed totals, so it stays display-only.
function DashboardHeader({ totals }) {
  return (
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
  );
}

// The add form handles global item creation and optional custom category creation.
function AddItemForm({
  categories,
  draftCategory,
  draftName,
  guessedCategory,
  newCategory,
  onAddItem,
  onDraftCategoryChange,
  onDraftNameChange,
  onNewCategoryChange,
}) {
  return (
    <form className="add-form" onSubmit={onAddItem}>
      <label htmlFor="item-name">Πρόσθεσε προϊόν</label>
      <div className="input-row">
        <input
          id="item-name"
          value={draftName}
          onChange={(event) => onDraftNameChange(event.target.value)}
          placeholder="π.χ. γιαούρτι, ρύζι, χαρτί κουζίνας"
        />
        <button type="submit">Προσθήκη</button>
      </div>

      <label htmlFor="category-select">Κατηγορία</label>
      <select
        id="category-select"
        value={draftCategory}
        onChange={(event) => onDraftCategoryChange(event.target.value)}
      >
        <option value="auto">Έξυπνη επιλογή: {guessedCategory}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <label htmlFor="new-category">Ή νέα κατηγορία</label>
      <input
        id="new-category"
        value={newCategory}
        onChange={(event) => onNewCategoryChange(event.target.value)}
        placeholder="π.χ. BBQ, Μωρό, Γιορτή"
      />
    </form>
  );
}

// Search and segmented filters live together because both decide list visibility.
function FilterPanel({ query, view, onQueryChange, onViewChange }) {
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

// Scanner is intentionally self-contained: scan/read first, categorize second, then add.
function ProductScanner({ categories, onAddScannedItem }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [lookupStatus, setLookupStatus] = useState("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupProduct, setLookupProduct] = useState(null);
  const [stagedCategory, setStagedCategory] = useState("Να μην ξεχάσω");
  const [stagedCode, setStagedCode] = useState("");
  const [stagedName, setStagedName] = useState("");

  // Stage 1: normalize whatever the scanner/manual input produced and ask the backend what it is.
  const handleCodeLookup = useCallback(
    async (rawCode) => {
      const code = normalizeScannedCode(rawCode);

      if (!code) {
        setLookupStatus("error");
        setLookupMessage("Βάλε ή σκάναρε έναν κωδικό προϊόντος.");
        return;
      }

      setLookupStatus("loading");
      setLookupMessage("Ψάχνω το προϊόν...");
      setLookupProduct(null);
      setStagedCode(code);
      setStagedName("");

      try {
        const result = await lookupProductCode(code);
        const product = result.product ?? null;
        const productName = product?.name ?? "";
        const suggestedCategory = productName ? suggestCategory(productName) : "Να μην ξεχάσω";
        const safeCategory = categories.includes(suggestedCategory) ? suggestedCategory : "Να μην ξεχάσω";

        // Stage 2 starts here: prefill what we know, but let the user correct it before saving.
        setLookupProduct(product);
        setStagedName(productName);
        setStagedCategory(safeCategory);
        setLookupStatus(productName ? "found" : "missing");
        setLookupMessage(
          productName
            ? "Το προϊόν αναγνωρίστηκε. Τσέκαρε όνομα και κατηγορία πριν το προσθέσεις."
            : "Δεν το βρήκα στη βάση προϊόντων. Μπορείς να γράψεις το όνομα και να το βάλεις κατηγορία.",
        );
      } catch {
        setLookupStatus("error");
        setLookupMessage("Δεν μπόρεσα να μιλήσω με τη βάση προϊόντων. Γράψε το όνομα χειροκίνητα αν θέλεις.");
        setStagedCategory("Να μην ξεχάσω");
      }
    },
    [categories],
  );

  useEffect(() => {
    if (!cameraOpen) {
      return undefined;
    }

    let cancelled = false;

    async function startCameraScanner() {
      if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
        setCameraMessage("Ο browser δεν υποστηρίζει camera barcode scan. Χρησιμοποίησε το πεδίο κωδικού από κάτω.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: SCANNER_FORMATS });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraMessage("Σημάδεψε το barcode ή QR μέσα στο πλαίσιο.");

        const scanFrame = async () => {
          if (cancelled || !videoRef.current) {
            return;
          }

          try {
            const codes = await detector.detect(videoRef.current);

            if (codes.length > 0) {
              setCameraOpen(false);
              handleCodeLookup(codes[0].rawValue);
              return;
            }
          } catch {
            setCameraMessage("Δυσκολεύομαι να διαβάσω την κάμερα. Δοκίμασε καλύτερο φως ή γράψε τον κωδικό.");
          }

          frameRef.current = requestAnimationFrame(scanFrame);
        };

        scanFrame();
      } catch {
        setCameraMessage("Δεν άνοιξε η κάμερα. Σε κινητό χρειάζεται HTTPS ή localhost και άδεια κάμερας.");
      }
    }

    startCameraScanner();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen, handleCodeLookup]);

  function handleManualLookup(event) {
    event.preventDefault();
    handleCodeLookup(manualCode);
  }

  // Only the confirmed stage-2 data enters the shopping list and persisted state.
  function handleAddScannedItem() {
    const name = stagedName.trim();

    if (!name || !stagedCategory) {
      return;
    }

    onAddScannedItem({ barcode: stagedCode, category: stagedCategory, name });
    setLookupStatus("idle");
    setLookupMessage("");
    setLookupProduct(null);
    setManualCode("");
    setStagedCode("");
    setStagedName("");
    setStagedCategory("Να μην ξεχάσω");
  }

  const productMeta = [lookupProduct?.brand, lookupProduct?.quantity].filter(Boolean).join(" - ");

  return (
    <section className="scanner-panel" aria-label="Scanner προϊόντος">
      <div className="section-label">Scanner</div>
      <label>Στάδιο 1: αναγνώριση προϊόντος</label>
      <button className="scanner-button" type="button" onClick={() => setCameraOpen((current) => !current)}>
        <span className="button-icon" aria-hidden="true">▣</span>
        <span>{cameraOpen ? "Κλείσιμο κάμερας" : "Scan barcode / QR"}</span>
      </button>

      {cameraOpen ? (
        <div className="scanner-camera">
          <video ref={videoRef} muted playsInline />
          <p>{cameraMessage}</p>
        </div>
      ) : null}

      <form className="scanner-manual" onSubmit={handleManualLookup}>
        <input
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="ή γράψε barcode / QR code"
        />
        <button type="submit">Αναγνώριση</button>
      </form>

      {lookupStatus !== "idle" ? <p className={`scanner-status ${lookupStatus}`}>{lookupMessage}</p> : null}

      {stagedCode ? (
        <div className="scanner-stage">
          <small>Κωδικός: {stagedCode}</small>
          {productMeta ? <small>{productMeta}</small> : null}

          <label htmlFor="scanned-product-name">Προϊόν που κατάλαβα</label>
          <input
            id="scanned-product-name"
            value={stagedName}
            onChange={(event) => setStagedName(event.target.value)}
            placeholder="π.χ. γάλα, κοτόπουλο, καφές"
          />

          <label htmlFor="scanned-product-category">Στάδιο 2: κατηγορία</label>
          <select
            id="scanned-product-category"
            value={stagedCategory}
            onChange={(event) => setStagedCategory(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button type="button" disabled={!stagedName.trim()} onClick={handleAddScannedItem}>
            Προσθήκη στη λίστα
          </button>
        </div>
      ) : null}
    </section>
  );
}
// The sidebar intentionally starts with the add form; the removed heading was visual noise.
function ControlsPanel({
  categories,
  draftCategory,
  draftName,
  guessedCategory,
  newCategory,
  query,
  view,
  onAddItem,
  onAddScannedItem,
  onClearCompleted,
  onDraftCategoryChange,
  onDraftNameChange,
  onNewCategoryChange,
  onQueryChange,
  onResetList,
  onViewChange,
}) {
  return (
    <aside className="controls-panel" aria-label="Προσθήκη και φίλτρα">
      <AddItemForm
        categories={categories}
        draftCategory={draftCategory}
        draftName={draftName}
        guessedCategory={guessedCategory}
        newCategory={newCategory}
        onAddItem={onAddItem}
        onDraftCategoryChange={onDraftCategoryChange}
        onDraftNameChange={onDraftNameChange}
        onNewCategoryChange={onNewCategoryChange}
      />

      <ProductScanner categories={categories} onAddScannedItem={onAddScannedItem} />

      <FilterPanel query={query} view={view} onQueryChange={onQueryChange} onViewChange={onViewChange} />

      <div className="secondary-actions">
        <button className="secondary-action danger" type="button" onClick={onClearCompleted}>
          <span className="button-icon" aria-hidden="true">⊠</span>
          <span>Καθάρισε όσα έχω</span>
        </button>
        <button className="secondary-action" type="button" onClick={onResetList}>
          <span className="button-icon" aria-hidden="true">↻</span>
          <span>Reset demo λίστας</span>
        </button>
      </div>
    </aside>
  );
}

// One row owns all item-level actions: status toggle, recategorize, and delete request.
function ItemRow({ categories, item, onRequestRemoveItem, onToggleItemStatus, onUpdateItemCategory }) {
  return (
    <div className={`item-row ${item.status}`}>
      <label className="item-check">
        <span className="item-name">{item.name}</span>
        <span className="have-toggle">
          <input
            aria-label={`${item.status === "have" ? "Αφαίρεση από Έχω σπίτι" : "Σήμανση ως Έχω σπίτι"}: ${item.name}`}
            checked={item.status === "have"}
            onChange={() => onToggleItemStatus(item.id)}
            type="checkbox"
          />
          <span>Το 'χω!</span>
        </span>
      </label>

      <select
        aria-label={`Αλλαγή κατηγορίας για ${item.name}`}
        value={item.category}
        onChange={(event) => onUpdateItemCategory(item.id, event.target.value)}
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <button
        aria-label={`Διαγραφή ${item.name}`}
        className="delete-button"
        type="button"
        onClick={() => onRequestRemoveItem(item)}
      >
        ×
      </button>
    </div>
  );
}

// A category card renders its quick-add form only when this category is active.
function CategoryCard({
  categories,
  group,
  quickAddCategory,
  quickAddName,
  onAddItemToCategory,
  onQuickAddNameChange,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleQuickAdd,
  onUpdateItemCategory,
}) {
  return (
    <article className="category-card">
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
            onClick={() => onToggleQuickAdd(group.category)}
          >
            +
          </button>
          <span>{group.items.length}</span>
        </div>
      </header>

      <div className="item-stack">
        {quickAddCategory === group.category ? (
          <form className="quick-add-form" onSubmit={(event) => onAddItemToCategory(event, group.category)}>
            <input
              autoFocus
              aria-label={`Νέο προϊόν για ${group.category}`}
              value={quickAddName}
              onChange={(event) => onQuickAddNameChange(event.target.value)}
              placeholder="Νέο προϊόν"
            />
            <button type="submit">+</button>
          </form>
        ) : null}

        {group.items.map((item) => (
          <ItemRow
            categories={categories}
            item={item}
            key={item.id}
            onRequestRemoveItem={onRequestRemoveItem}
            onToggleItemStatus={onToggleItemStatus}
            onUpdateItemCategory={onUpdateItemCategory}
          />
        ))}
      </div>
    </article>
  );
}

// The list area decides whether to show empty state or grouped category cards.
function ShoppingList({
  categories,
  itemsByCategory,
  quickAddCategory,
  quickAddName,
  onAddItemToCategory,
  onQuickAddNameChange,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleQuickAdd,
  onUpdateItemCategory,
}) {
  if (itemsByCategory.length === 0) {
    return (
      <section className="list-area" aria-label="Λίστα προϊόντων">
        <div className="empty-state">
          <h2>Δεν βρέθηκαν προϊόντα.</h2>
          <p>Άλλαξε φίλτρο ή πρόσθεσε κάτι καινούριο από την αριστερή πλευρά.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="list-area" aria-label="Λίστα προϊόντων">
      {itemsByCategory.map((group) => (
        <CategoryCard
          categories={categories}
          group={group}
          key={group.category}
          quickAddCategory={quickAddCategory}
          quickAddName={quickAddName}
          onAddItemToCategory={onAddItemToCategory}
          onQuickAddNameChange={onQuickAddNameChange}
          onRequestRemoveItem={onRequestRemoveItem}
          onToggleItemStatus={onToggleItemStatus}
          onToggleQuickAdd={onToggleQuickAdd}
          onUpdateItemCategory={onUpdateItemCategory}
        />
      ))}
    </section>
  );
}

// Confirmation modal prevents accidental item deletion from a category.
function DeleteConfirmModal({ item, onCancel, onConfirm }) {
  if (!item) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
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
          Θέλεις όντως να διαγράψεις το <strong>{item.name}</strong> από την κατηγορία <strong>{item.category}</strong>;
        </p>
        <div className="modal-actions">
          <button type="button" className="modal-secondary" onClick={onCancel}>
            Άκυρο
          </button>
          <button type="button" className="modal-danger" onClick={onConfirm}>
            Διαγραφή
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  // App state is persisted by the storage layer; UI state stays local to this component.
  const [state, setState] = useState(buildInitialState);
  const [storageReady, setStorageReady] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("auto");
  const [newCategory, setNewCategory] = useState("");
  const [quickAddCategory, setQuickAddCategory] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);

  // Load server/browser persisted state once, then let React own the live edits.
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
      })
      .catch(() => {
        if (isMounted) {
          setStorageReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Save every list/category change after the initial state has loaded.
  useEffect(() => {
    if (!storageReady) {
      return;
    }

    saveStoredState(state).catch(() => {
      // The storage layer already falls back locally; no user-blocking action is needed here.
    });
  }, [state, storageReady]);

  // Derived values keep render code small and avoid repeated filtering work.
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

  // Global add respects manual category, smart category, or a brand-new custom category.
  function addItem(event) {
    event.preventDefault();

    const name = draftName.trim();
    const customCategory = newCategory.trim();
    const category = customCategory || (draftCategory === "auto" ? guessedCategory : draftCategory);

    if (!name || !category) {
      return;
    }

    setState((current) => {
      const categories = current.categories.includes(category) ? current.categories : [...current.categories, category];

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

  // Scanned products enter the same persisted list after the user confirms category.
  function addScannedItem({ barcode, category, name }) {
    const trimmedName = name.trim();

    if (!trimmedName || !category) {
      return;
    }

    setState((current) => {
      const categories = current.categories.includes(category) ? current.categories : [...current.categories, category];

      return {
        categories,
        items: [
          {
            barcode,
            category,
            createdAt: Date.now(),
            id: crypto.randomUUID?.() ?? `${Date.now()}-${trimmedName}`,
            name: trimmedName,
            status: "needed",
          },
          ...current.items,
        ],
      };
    });

    setQuery("");
    setView("all");
  }
  // Quick-add is scoped to an existing category card.
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

  // Item operations are intentionally tiny so they stay easy to pass to child components.
  function toggleQuickAdd(category) {
    setQuickAddCategory((currentCategory) => (currentCategory === category ? "" : category));
    setQuickAddName("");
  }

  function toggleItemStatus(itemId) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, status: item.status === "needed" ? "have" : "needed" } : item,
      ),
    }));
  }

  function updateItemCategory(itemId, category) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, category } : item)),
    }));
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

  // Bulk actions live at app level because they mutate the full list.
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
    setPendingDeleteItem(null);
  }

  return (
    <main className="app-shell">
      <DashboardHeader totals={totals} />

      <section className="workspace">
        <ControlsPanel
          categories={state.categories}
          draftCategory={draftCategory}
          draftName={draftName}
          guessedCategory={guessedCategory}
          newCategory={newCategory}
          query={query}
          view={view}
          onAddItem={addItem}
          onAddScannedItem={addScannedItem}
          onClearCompleted={clearCompleted}
          onDraftCategoryChange={setDraftCategory}
          onDraftNameChange={setDraftName}
          onNewCategoryChange={setNewCategory}
          onQueryChange={setQuery}
          onResetList={resetList}
          onViewChange={setView}
        />

        <ShoppingList
          categories={state.categories}
          itemsByCategory={itemsByCategory}
          quickAddCategory={quickAddCategory}
          quickAddName={quickAddName}
          onAddItemToCategory={addItemToCategory}
          onQuickAddNameChange={setQuickAddName}
          onRequestRemoveItem={setPendingDeleteItem}
          onToggleItemStatus={toggleItemStatus}
          onToggleQuickAdd={toggleQuickAdd}
          onUpdateItemCategory={updateItemCategory}
        />
      </section>

      <DeleteConfirmModal
        item={pendingDeleteItem}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={confirmRemoveItem}
      />
    </main>
  );
}

export default App;
