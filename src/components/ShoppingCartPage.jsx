import { getCategoryIcon } from "../utils/categories";
import { formatEuroAmount, getEstimatedLineTotal } from "../utils/price";
import { getQuantityNote, normalizeQuantityCount } from "../utils/quantity";
import { ScrollTopButton } from "./ScrollTopButton";

function getCartItemName(item) {
  const quantityCount = normalizeQuantityCount(item.quantityCount);

  return quantityCount > 1 ? `${item.name} (${quantityCount})` : item.name;
}

export function ShoppingCartPage({
  items,
  onBack,
  onFinishShopping,
  onTogglePriceFields,
  onToggleTaken,
  onUpdateItemEstimatedPrice,
  showPriceFields,
}) {
  const takenCount = items.filter((item) => item.status === "have").length;
  const remainingCount = items.length - takenCount;
  const estimatedTotal = items.reduce((total, item) => total + getEstimatedLineTotal(item), 0);

  return (
    <main className="cart-shell">
      <section className="cart-hero">
        <div>
          <p className="eyebrow">Το καλάθι μου</p>
          <h2>Checklist για το supermarket.</h2>
          <p className="dashboard-note">Τσέκαρε κάθε προϊόν όταν το βάλεις στο καλάθι. Οι επιλογές σώζονται στη λίστα σου.</p>
        </div>
        <div className="cart-actions">
          <button
            aria-pressed={showPriceFields}
            className={`cart-price-toggle ${showPriceFields ? "active" : ""}`}
            type="button"
            onClick={onTogglePriceFields}
          >
            Τιμές
          </button>
          <button className="cart-back-button" type="button" onClick={onBack}>
            Πάμε πίσω
          </button>
          <button className="cart-finish-button" type="button" onClick={onFinishShopping}>
            Τέλος αγορών
          </button>
        </div>
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
        <span>
          <small>Εκτίμηση</small>
          <strong>{formatEuroAmount(estimatedTotal)}</strong>
        </span>
      </section>

      <section className="cart-list" aria-label="Checklist προϊόντων">
        {items.length === 0 ? (
          <div className="cart-empty">
            <h2>Δεν έχεις προϊόντα για αγορά.</h2>
            <p>Πήγαινε πίσω και βάλε προϊόντα στο Χρειάζομαι για να φτιαχτεί το καλάθι.</p>
          </div>
        ) : (
          items.map((item) => {
            const quantityNote = getQuantityNote(item).trim();

            return (
              <div className={`cart-item ${item.status === "have" ? "taken" : ""}`} key={item.id}>
                <input
                  aria-label={`${item.status === "have" ? "Ξανά στη λίστα" : "Το πήρα"}: ${item.name}`}
                  checked={item.status === "have"}
                  onChange={() => onToggleTaken(item.id)}
                  type="checkbox"
                />
                <span className="cart-item-main">
                  <span className="cart-item-title">
                    <span className="cart-item-name">{getCartItemName(item)}</span>
                    <span className="cart-item-category">
                      <span aria-hidden="true">{getCategoryIcon(item.category)}</span>
                      <span>{item.category}</span>
                    </span>
                  </span>
                  {quantityNote ? <span className="cart-item-quantity">{quantityNote}</span> : null}
                  {showPriceFields ? (
                    <label className="cart-price-field">
                      <span>Τιμή / τεμ.</span>
                      <input
                        aria-label={`Εκτιμώμενη τιμή για ${item.name}`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={item.estimatedPrice ?? ""}
                        onChange={(event) => onUpdateItemEstimatedPrice(item.id, event.target.value)}
                      />
                    </label>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </section>

      <ScrollTopButton />
    </main>
  );
}
