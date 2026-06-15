import { useEffect, useState } from "react";
import { getCategoryIcon } from "../utils/categories";
import { formatEuroAmount, getEstimatedLineTotal, parseEstimatedPrice } from "../utils/price";
import { getQuantitySummary, hasCustomQuantity, normalizeQuantityCount } from "../utils/quantity";

function QuantityEditor({ item, onUpdateItemQuantityCount, onUpdateItemQuantityNote }) {
  const quantityCount = normalizeQuantityCount(item.quantityCount);
  const [quantityDraft, setQuantityDraft] = useState(String(quantityCount));

  useEffect(() => {
    setQuantityDraft(String(quantityCount));
  }, [quantityCount]);

  return (
    <div className="quantity-field" aria-label={`Ποσότητα για ${item.name}`}>
      <span>Ποσ.</span>
      <div className="quantity-controls">
        <button
          aria-label={`Μείωση ποσότητας για ${item.name}`}
          className="quantity-stepper"
          disabled={quantityCount <= 1}
          type="button"
          onClick={() => {
            const nextCount = Math.max(1, quantityCount - 1);
            setQuantityDraft(String(nextCount));
            onUpdateItemQuantityCount(item.id, nextCount);
          }}
        >
          -
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
              setQuantityDraft("1");
              onUpdateItemQuantityCount(item.id, 1);
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
        <button
          aria-label={`Αύξηση ποσότητας για ${item.name}`}
          className="quantity-stepper"
          type="button"
          onClick={() => {
            const nextCount = quantityCount + 1;
            setQuantityDraft(String(nextCount));
            onUpdateItemQuantityCount(item.id, nextCount);
          }}
        >
          +
        </button>
        <input
          aria-label={`Σημείωση ποσότητας για ${item.name}`}
          className="quantity-note"
          value={item.quantityNote ?? ""}
          onChange={(event) => onUpdateItemQuantityNote(item.id, event.target.value)}
          placeholder="500γρ"
        />
      </div>
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

function ItemRow({
  item,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onUpdateItemEstimatedPrice,
  onUpdateItemQuantityCount,
  onUpdateItemQuantityNote,
}) {
  return (
    <div className={`item-row ${item.status}`}>
      <div className="item-check">
        <span className="item-name">
          <strong>{item.name}</strong>
          {hasCustomQuantity(item) ? <span className="quantity-summary">{getQuantitySummary(item)}</span> : null}
        </span>
        <span className="item-actions">
          <span className="have-toggle">
            <input
              aria-label={`${item.status === "have" ? "Αφαίρεση από Έχω σπίτι" : "Σήμανση ως Έχω σπίτι"}: ${item.name}`}
              checked={item.status === "have"}
              onChange={() => onToggleItemStatus(item.id)}
              type="checkbox"
            />
            <span>Το 'χω!</span>
          </span>
          <button
            aria-pressed={item.status === "notNeeded"}
            className={`not-needed-toggle ${item.status === "notNeeded" ? "active" : ""}`}
            type="button"
            onClick={() => onToggleNotNeededStatus(item.id)}
          >
            Δεν θέλω
          </button>
        </span>
      </div>

      <div className="item-detail-fields">
        <QuantityEditor
          item={item}
          onUpdateItemQuantityCount={onUpdateItemQuantityCount}
          onUpdateItemQuantityNote={onUpdateItemQuantityNote}
        />
        <PriceEditor item={item} onUpdateItemEstimatedPrice={onUpdateItemEstimatedPrice} />
      </div>

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

function CategoryCard({
  group,
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
            item={item}
            key={item.id}
            onRequestRemoveItem={onRequestRemoveItem}
            onToggleItemStatus={onToggleItemStatus}
            onToggleNotNeededStatus={onToggleNotNeededStatus}
            onUpdateItemEstimatedPrice={onUpdateItemEstimatedPrice}
            onUpdateItemQuantityCount={onUpdateItemQuantityCount}
            onUpdateItemQuantityNote={onUpdateItemQuantityNote}
          />
        ))}
      </div>
    </article>
  );
}

export function ShoppingList({
  itemsByCategory,
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
          group={group}
          key={group.category}
          quickAddCategory={quickAddCategory}
          quickAddName={quickAddName}
          onAddItemToCategory={onAddItemToCategory}
          onQuickAddNameChange={onQuickAddNameChange}
          onRequestRemoveItem={onRequestRemoveItem}
          onToggleItemStatus={onToggleItemStatus}
          onToggleNotNeededStatus={onToggleNotNeededStatus}
          onToggleQuickAdd={onToggleQuickAdd}
          onUpdateItemEstimatedPrice={onUpdateItemEstimatedPrice}
          onUpdateItemQuantityCount={onUpdateItemQuantityCount}
          onUpdateItemQuantityNote={onUpdateItemQuantityNote}
        />
      ))}
    </section>
  );
}
