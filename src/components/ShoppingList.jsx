import { getCategoryIcon } from "../utils/categories";

function ItemRow({
  item,
  view,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onUpdateItemQuantity,
}) {
  return (
    <div className={`item-row ${item.status}`}>
      <div className="item-check">
        <span className="item-name">{item.name}</span>
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

      {item.status === "have" && view === "have" ? (
        <label className="quantity-field">
          <span>Ποσότητα</span>
          <input
            aria-label={`Ποσότητα για ${item.name}`}
            value={item.quantity ?? ""}
            onChange={(event) => onUpdateItemQuantity(item.id, event.target.value)}
            placeholder="π.χ. 500γρ"
          />
        </label>
      ) : null}

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
  view,
  quickAddCategory,
  quickAddName,
  onAddItemToCategory,
  onQuickAddNameChange,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onToggleQuickAdd,
  onUpdateItemQuantity,
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
            view={view}
            onRequestRemoveItem={onRequestRemoveItem}
            onToggleItemStatus={onToggleItemStatus}
            onToggleNotNeededStatus={onToggleNotNeededStatus}
            onUpdateItemQuantity={onUpdateItemQuantity}
          />
        ))}
      </div>
    </article>
  );
}

export function ShoppingList({
  itemsByCategory,
  view,
  quickAddCategory,
  quickAddName,
  onAddItemToCategory,
  onQuickAddNameChange,
  onRequestRemoveItem,
  onToggleItemStatus,
  onToggleNotNeededStatus,
  onToggleQuickAdd,
  onUpdateItemQuantity,
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
          view={view}
          quickAddCategory={quickAddCategory}
          quickAddName={quickAddName}
          onAddItemToCategory={onAddItemToCategory}
          onQuickAddNameChange={onQuickAddNameChange}
          onRequestRemoveItem={onRequestRemoveItem}
          onToggleItemStatus={onToggleItemStatus}
          onToggleNotNeededStatus={onToggleNotNeededStatus}
          onToggleQuickAdd={onToggleQuickAdd}
          onUpdateItemQuantity={onUpdateItemQuantity}
        />
      ))}
    </section>
  );
}
