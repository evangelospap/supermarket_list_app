import { useCallback, useEffect, useRef, useState } from "react";
import { lookupProductCode } from "../storage";
import { normalizeScannedCode, SCANNER_FORMATS } from "../utils/scanner";
import { suggestCategory } from "../utils/categories";

export function ProductScanner({ categories, onAddScannedItem }) {
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
        const preferredCategory = product?.category || suggestedCategory;
        const safeCategory = categories.includes(preferredCategory) ? preferredCategory : "Να μην ξεχάσω";

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
      if (!window.isSecureContext) {
        setCameraMessage("Η κάμερα θέλει HTTPS ή localhost. Με απλό http από κινητό χρησιμοποίησε το πεδίο κωδικού.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage("Ο browser δεν δίνει πρόσβαση στην κάμερα. Χρησιμοποίησε το πεδίο κωδικού από κάτω.");
        return;
      }

      if (!("BarcodeDetector" in window)) {
        setCameraMessage("Ο browser έχει κάμερα, αλλά δεν έχει ενσωματωμένο barcode scanner. Σε browser γράψε τον κωδικό από κάτω.");
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
      <div className="section-label">Scan για προσθήκη</div>
      {/* <label>Στάδιο 1: αναγνώριση προϊόντος</label> */}
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
