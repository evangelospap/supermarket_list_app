import { getCategoryIcon } from "../utils/categories";
import { ScrollTopButton } from "./ScrollTopButton";

export function ShoppingCartPage({ items, onBack, onToggleTaken }) {
  const takenCount = items.filter((item) => item.status === "have").length;
  const remainingCount = items.length - takenCount;

  return (
    <main className="cart-shell">
      <section className="cart-hero">
        <div>
          <p className="eyebrow">Το καλάθι μου</p>
          <h2>Checklist για το supermarket.</h2>
          <p className="dashboard-note">Τσέκαρε κάθε προϊόν όταν το βάλεις στο καλάθι. Οι επιλογές σώζονται στη λίστα σου.</p>
        </div>
        <button className="cart-back-button" type="button" onClick={onBack}>
          Πάμε πίσω
        </button>
      </section>

      <section className="cart-summary" aria-label="Σύνοψη καλαθιού">
        <span>
          <small>Μένουν</small>
          <strong>{remainingCount}</strong>
        </span>
        <span>
          <small>Τα πήρα</small>
          <strong>{takenCount}</strong>
        </span>
        <span>
          <small>Σύνολο διαδρομής</small>
          <strong>{items.length}</strong>
        </span>
      </section>

      <section className="cart-list" aria-label="Checklist προϊόντων">
        {items.length === 0 ? (
          <div className="cart-empty">
            <h2>Δεν έχεις προϊόντα για αγορά.</h2>
            <p>Πήγαινε πίσω και βάλε προϊόντα στο Χρειάζομαι για να φτιαχτεί το καλάθι.</p>
          </div>
        ) : (
          items.map((item) => (
            <label className={`cart-item ${item.status === "have" ? "taken" : ""}`} key={item.id}>
              <input
                checked={item.status === "have"}
                onChange={() => onToggleTaken(item.id)}
                type="checkbox"
              />
              <span className="cart-item-main">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-category">
                  {getCategoryIcon(item.category)} {item.category}
                </span>
              </span>
              <span className="cart-item-status">{item.status === "have" ? "Το πήρα!" : "Εκκρεμεί"}</span>
            </label>
          ))
        )}
      </section>

      <ScrollTopButton />
    </main>
  );
}
