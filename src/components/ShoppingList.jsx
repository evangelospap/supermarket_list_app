import { useEffect, useRef, useState } from "react";
import { getCategoryIcon } from "../utils/categories";
import { formatEuroAmount, getEstimatedLineTotal, parseEstimatedPrice } from "../utils/price";
import { getQuantityNote, normalizeQuantityCount } from "../utils/quantity";

const COLLAPSED_CATEGORIES_STORAGE_KEY = "supermarket-collapsed-categories";

function isMobileViewport() {
  try {
    return globalThis.matchMedia?.("(max-width: 620px)")?.matches ?? false;
  } catch {
    return false;
  }
}

function readCollapsedCategories(categoryNames = []) {
  if (isMobileViewport()) {
    return new Set(categoryNames);
  }

  try {
    return new Set(JSON.parse(globalThis.localStorage?.getItem(COLLAPSED_CATEGORIES_STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function writeCollapsedCategories(categories) {
  try {
    globalThis.localStorage?.setItem(COLLAPSED_CATEGORIES_STORAGE_KEY, JSON.stringify([...categories]));
  } catch {
    // Local UI preference only; ignore unavailable storage.
  }
}

function getCategoryPanelId(category) {
  return `category-panel-${encodeURIComponent(category)}`;
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function QuantityStepper({ item, onUpdateItemQuantityCount }) {
  const quantityCount = normalizeQuantityCount(item.quantityCount);
  const [quantityDraft, setQuantityDraft] = useState(String(quantityCount));

  useEffect(() => {
    setQuantityDraft(String(quantityCount));
  }, [quantityCount]);

  function updateQuantity(nextCount) {
    const normalizedCount = normalizeQuantityCount(nextCount);
    setQuantityDraft(String(normalizedCount));
    onUpdateItemQuantityCount(item.id, normalizedCount);
  }

  return (
    <div className="row-quantity-stepper" aria-label={`Ποσότητα για ${item.name}`}>
      <button
        aria-label={`Μείωση ποσότητας για ${item.name}`}
        disabled={quantityCount <= 1}
        type="button"
        onClick={() => updateQuantity(quantityCount - 1)}
      >
        −
      </button>
      <input
        aria-label={`Αριθμός τεμαχίων για ${item.name}`}
        inputMode="numeric"
        min="1"
        pattern="[0-9]*"
        type="text"
        value={quantityDraft}
        onBlur={(event) => {
          if (!event.target.value.trim()) {
            updateQuantity(1);
          }
        }}
        onChange={(event) => {
          const nextValue = event.target.value.replace(/\D/g, "");
          setQuantityDraft(nextValue);

          if (nextValue) {
            onUpdateItemQuantityCount(item.id, Number(nextValue));
          }
        }}
      />
      <button aria-label={`Αύξηση ποσότητας για ${item.name}`} type="button" onClick={() => updateQuantity(quantityCount + 1)}>
        +
      </button>
    </div>
  );
}

function PriceEditor({ item, onUpdateItemEstimatedPrice }) {
  const hasPrice = parseEstimatedPrice(item.estimatedPrice) > 0;

  return (
    <label className="price-field">
      <span>€/τεμ.</span>
      <input
        aria-label={`Εκτιμώμενη τιμή για ${item.name}`}
        inputMode="decimal"
        placeholder="0.00"
        value={item.estimatedPrice ?? ""}
        onChange={(event) => onUpdateItemEstimatedPrice(item.id, event.target.value)}
      />
      {hasPrice ? <small>{formatEuroAmount(getEstimatedLineTotal(item))}</small> : null}
    </label>
  );
}

function ItemEditPanel({
  item,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onUpdateItemEstimatedPrice,
  onUpdateItemQuantityNote,
  showPriceFields,
}) {
  return (
    <div className={`item-detail-fields ${showPriceFields ? "with-prices" : "without-prices"}`}>
      <div className="item-status-tools">
        <button
          aria-pressed={item.status === "have"}
          className={`have-toggle ${item.status === "have" ? "active" : ""}`}
          type="button"
          onClick={() => onToggleItemStatus(item.id)}
        >
          Το 'χω!
        </button>
        <button
          aria-pressed={item.status === "notNeeded"}
          className={`not-needed-toggle ${item.status === "notNeeded" ? "active" : ""}`}
          type="button"
          onClick={() => onToggleNotNeededStatus(item.id)}
        >
          Δεν θέλω
        </button>
      </div>

      <label className="quantity-note-field">
        <span>Qt.</span>
        <input
          aria-label={`Σημείωση ποσότητας για ${item.name}`}
          className="quantity-note"
          value={item.quantityNote ?? ""}
          onChange={(event) => onUpdateItemQuantityNote(item.id, event.target.value)}
          placeholder="π.χ. 500γρ"
        />
      </label>

      {showPriceFields ? <PriceEditor item={item} onUpdateItemEstimatedPrice={onUpdateItemEstimatedPrice} /> : null}
    </div>
  );
}

function ItemRow({
  item,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onUpdateItemEstimatedPrice,
  onUpdateItemQuantityCount,
  onUpdateItemQuantityNote,
  showPriceFields,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const quantityNote = getQuantityNote(item).trim();

  return (
    <div className={`item-row ${item.status} ${isEditing ? "editing" : ""}`}>
      <div className="item-check">
        <input
          aria-label={`${item.status === "have" ? "Αφαίρεση από Έχω σπίτι" : "Σήμανση ως Έχω σπίτι"}: ${item.name}`}
          checked={item.status === "have"}
          onChange={() => onToggleItemStatus(item.id)}
          type="checkbox"
        />
        <span className="item-name">
          <strong>{item.name}</strong>
          {quantityNote ? <span className="quantity-summary">{quantityNote}</span> : null}
        </span>
      </div>

      <div className="row-tools">
        <QuantityStepper item={item} onUpdateItemQuantityCount={onUpdateItemQuantityCount} />
        <button
          aria-expanded={isEditing}
          aria-label={`Επεξεργασία ${item.name}`}
          className="icon-row-button edit-row-button"
          type="button"
          onClick={() => setIsEditing((current) => !current)}
        >
          <EditIcon />
        </button>
        <button
          aria-label={`Διαγραφή ${item.name}`}
          className="icon-row-button delete-row-button"
          type="button"
          onClick={() => onRequestRemoveItem(item)}
        >
          <TrashIcon />
        </button>
      </div>

      {isEditing ? (
        <ItemEditPanel
          item={item}
          onToggleItemStatus={onToggleItemStatus}
          onToggleNotNeededStatus={onToggleNotNeededStatus}
          onUpdateItemEstimatedPrice={onUpdateItemEstimatedPrice}
          onUpdateItemQuantityNote={onUpdateItemQuantityNote}
          showPriceFields={showPriceFields}
        />
      ) : null}
    </div>
  );
}

function CategoryCard({
  group,
  isCollapsed,
  quickAddCategory,
  quickAddName,
  onAddItemToCategory,
  onToggleCategoryCollapsed,
  onQuickAddNameChange,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onToggleQuickAdd,
  onUpdateItemEstimatedPrice,
  onUpdateItemQuantityCount,
  onUpdateItemQuantityNote,
  showPriceFields,
}) {
  const categoryPanelId = getCategoryPanelId(group.category);

  return (
    <article className={`category-card ${isCollapsed ? "collapsed" : ""}`}>
      <header>
        <button
          aria-controls={categoryPanelId}
          aria-expanded={!isCollapsed}
          className="category-heading-button"
          type="button"
          onClick={() => onToggleCategoryCollapsed(group.category)}
        >
          <span className={`category-chevron ${isCollapsed ? "" : "open"}`} aria-hidden="true">
            ›
          </span>
          <span className="category-title">
            <span className="category-icon" aria-hidden="true">
              {getCategoryIcon(group.category)}
            </span>
            <span className="category-name">{group.category}</span>
          </span>
        </button>
        <div className="category-actions">
          <button
            aria-label={`Προσθήκη προϊόντος στην κατηγορία ${group.category}`}
            className="quick-add-toggle"
            type="button"
            onClick={() => {
              if (isCollapsed) {
                onToggleCategoryCollapsed(group.category);
              }

              onToggleQuickAdd(group.category);
            }}
          >
            +
          </button>
          <span className="category-count">{group.items.length}</span>
        </div>
      </header>

      {!isCollapsed ? (
        <div className="item-stack" id={categoryPanelId}>
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
              item={item}
              key={item.id}
              onRequestRemoveItem={onRequestRemoveItem}
              onToggleItemStatus={onToggleItemStatus}
              onToggleNotNeededStatus={onToggleNotNeededStatus}
              onUpdateItemEstimatedPrice={onUpdateItemEstimatedPrice}
              onUpdateItemQuantityCount={onUpdateItemQuantityCount}
              onUpdateItemQuantityNote={onUpdateItemQuantityNote}
              showPriceFields={showPriceFields}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ShoppingList({
  itemsByCategory,
  productsSectionRef,
  quickAddCategory,
  quickAddName,
  onAddItemToCategory,
  onQuickAddNameChange,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onToggleQuickAdd,
  onUpdateItemEstimatedPrice,
  onUpdateItemQuantityCount,
  onUpdateItemQuantityNote,
  showPriceFields,
}) {
  const categoryNames = itemsByCategory.map((group) => group.category);
  const categoryKey = categoryNames.join("|");
  const didApplyMobileDefault = useRef(categoryNames.length > 0);
  const [collapsedCategories, setCollapsedCategories] = useState(() => readCollapsedCategories(categoryNames));

  useEffect(() => {
    if (didApplyMobileDefault.current || !isMobileViewport() || categoryNames.length === 0) {
      return;
    }

    didApplyMobileDefault.current = true;
    setCollapsedCategories(new Set(categoryNames));
  }, [categoryKey, categoryNames]);

  function toggleCategoryCollapsed(category) {
    setCollapsedCategories((current) => {
      const next = new Set(current);

      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }

      writeCollapsedCategories(next);
      return next;
    });
  }

  if (itemsByCategory.length === 0) {
    return (
      <section className="list-area" ref={productsSectionRef} aria-label="Λίστα προϊόντων">
        <div className="empty-state">
          <h2>Δεν βρέθηκαν προϊόντα.</h2>
          <p>Άλλαξε φίλτρο ή πρόσθεσε κάτι καινούριο από την αριστερή πλευρά.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="list-area" ref={productsSectionRef} aria-label="Λίστα προϊόντων">
      {itemsByCategory.map((group) => (
        <CategoryCard
          group={group}
          isCollapsed={collapsedCategories.has(group.category)}
          key={group.category}
          quickAddCategory={quickAddCategory}
          quickAddName={quickAddName}
          onAddItemToCategory={onAddItemToCategory}
          onToggleCategoryCollapsed={toggleCategoryCollapsed}
          onQuickAddNameChange={onQuickAddNameChange}
          onRequestRemoveItem={onRequestRemoveItem}
          onToggleItemStatus={onToggleItemStatus}
          onToggleNotNeededStatus={onToggleNotNeededStatus}
          onToggleQuickAdd={onToggleQuickAdd}
          onUpdateItemEstimatedPrice={onUpdateItemEstimatedPrice}
          onUpdateItemQuantityCount={onUpdateItemQuantityCount}
          onUpdateItemQuantityNote={onUpdateItemQuantityNote}
          showPriceFields={showPriceFields}
        />
      ))}
    </section>
  );
}
