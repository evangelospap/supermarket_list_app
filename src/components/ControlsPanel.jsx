import { AddItemForm } from "./AddItemForm";
import { FilterPanel } from "./FilterPanel";
import { ProductScanner } from "./ProductScanner";
import { VoiceAddPanel } from "./VoiceAddPanel";

export function ControlsPanel({
  categories,
  draftCategory,
  draftName,
  draftQuantityCount,
  guessedCategory,
  homeSnapshots = [],
  newCategory,
  query,
  view,
  onAddItem,
  onAddScannedItem,
  onAddVoiceItems,
  onClearCompleted,
  onDraftCategoryChange,
  onDraftNameChange,
  onDraftQuantityCountChange,
  onNewCategoryChange,
  onQueryChange,
  onResetList,
  onRestoreHomeSnapshot,
  onTogglePriceFields,
  onViewChange,
  showPriceFields,
}) {
  return (
    <aside className="controls-panel" aria-label="Προσθήκη και φίλτρα">
      {/* <FilterPanel query={query} view={view} onQueryChange={onQueryChange} onViewChange={onViewChange} /> */}

      <AddItemForm
        categories={categories}
        draftCategory={draftCategory}
        draftName={draftName}
        draftQuantityCount={draftQuantityCount}
        guessedCategory={guessedCategory}
        newCategory={newCategory}
        onAddItem={onAddItem}
        onDraftCategoryChange={onDraftCategoryChange}
        onDraftNameChange={onDraftNameChange}
        onDraftQuantityCountChange={onDraftQuantityCountChange}
        onNewCategoryChange={onNewCategoryChange}
      />

      <VoiceAddPanel categories={categories} onAddVoiceItems={onAddVoiceItems} />

      <ProductScanner categories={categories} onAddScannedItem={onAddScannedItem} />

      <div className="secondary-actions">
        <button className="secondary-action danger" type="button" onClick={onClearCompleted}>
          <span className="button-icon" aria-hidden="true">🗑</span>
          <span>Καθάρισε όσα έχω</span>
        </button>
        <button
          aria-pressed={showPriceFields}
          className={`secondary-action price-toggle ${showPriceFields ? "active" : ""}`}
          type="button"
          onClick={onTogglePriceFields}
        >
          <span className="button-icon" aria-hidden="true">€</span>
          <span>Τιμές</span>
        </button>
        <button className="secondary-action" type="button" onClick={onResetList}>
          <span className="button-icon" aria-hidden="true">↻</span>
          <span>Reset Έχω σπίτι</span>
        </button>
      </div>

      <HomeSnapshots snapshots={homeSnapshots} onRestoreSnapshot={onRestoreHomeSnapshot} />
    </aside>
  );
}

function formatSnapshotDate(value) {
  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Άγνωστη ώρα";
  }
}

function getSnapshotTotalQuantity(snapshot) {
  return (snapshot.items ?? []).reduce((total, item) => total + (Number.isFinite(item.quantityCount) ? item.quantityCount : 1), 0);
}

function HomeSnapshots({ onRestoreSnapshot, snapshots }) {
  const visibleSnapshots = snapshots.slice(0, 3);

  return (
    <section className="home-snapshots" aria-label="Καταγραφές σπιτιού">
      <div className="section-label">Καταγραφές σπιτιού</div>
      {visibleSnapshots.length === 0 ? (
        <p>Δεν υπάρχει ακόμα αποθηκευμένο reset σπιτιού.</p>
      ) : (
        <ol>
          {visibleSnapshots.map((snapshot) => (
            <li key={snapshot.id}>
              <div className="home-snapshot-summary">
                <strong>{formatSnapshotDate(snapshot.createdAt)}</strong>
                <span>
                  {(snapshot.items ?? []).length} προϊόντα · {getSnapshotTotalQuantity(snapshot)} τεμ.
                </span>
              </div>
              <button className="home-snapshot-restore" type="button" onClick={() => onRestoreSnapshot(snapshot)}>
                Επαναφορά
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
