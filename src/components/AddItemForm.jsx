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
