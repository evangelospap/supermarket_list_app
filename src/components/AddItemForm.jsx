export function AddItemForm({
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
      <div className="panel-section-header">
        <span className="section-label">Πρόσθεσε προϊόν</span>
      </div>

      <label className="field-shell" htmlFor="item-name">
        <span>Προϊόν</span>
        <input
          id="item-name"
          value={draftName}
          onChange={(event) => onDraftNameChange(event.target.value)}
          placeholder="π.χ. γιαούρτι, ρύζι, χαρτί κουζίνας"
        />
      </label>

      <label className="field-shell" htmlFor="category-select">
        <span>Κατηγορία</span>
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
      </label>

      <label className="field-shell" htmlFor="new-category">
        <span>Νέα κατηγορία</span>
        <input
          id="new-category"
          value={newCategory}
          onChange={(event) => onNewCategoryChange(event.target.value)}
          placeholder="π.χ. BBQ, Μωρό, Γιορτή"
        />
      </label>

      <button className="add-submit-button" type="submit">
        <span className="submit-plus-icon" aria-hidden="true">
          +
        </span>
        Προσθήκη
      </button>
    </form>
  );
}
