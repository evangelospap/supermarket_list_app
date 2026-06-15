import { AddItemForm } from "./AddItemForm";
import { FilterPanel } from "./FilterPanel";
import { ProductScanner } from "./ProductScanner";

export function ControlsPanel({
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
      {/* <FilterPanel query={query} view={view} onQueryChange={onQueryChange} onViewChange={onViewChange} /> */}

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

      <div className="secondary-actions">
        <button className="secondary-action danger" type="button" onClick={onClearCompleted}>
          <span className="button-icon" aria-hidden="true">⊠</span>
          <span>Καθάρισε όσα έχω</span>
        </button>
        <button className="secondary-action" type="button" onClick={onResetList}>
          <span className="button-icon" aria-hidden="true">↻</span>
          <span>Reset σε προεπιλεγμένη λίστα</span>
        </button>
      </div>

    </aside>
  );
}
