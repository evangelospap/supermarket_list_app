import { useEffect, useMemo, useRef, useState } from "react";
import { suggestCategory } from "../utils/categories";

function getSpeechRecognition() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function splitVoiceItems(text) {
  return text
    .split(/[,;.\n]+|\s+(?:και|κι)\s+/giu)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildStagedItem(name) {
  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${name}`,
    category: suggestCategory(name),
    name,
  };
}

export function VoiceAddPanel({ categories, onAddVoiceItems }) {
  const recognitionRef = useRef(null);
  const [isSupported, setIsSupported] = useState(() => Boolean(getSpeechRecognition()));
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");
  const [stagedItems, setStagedItems] = useState([]);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognition()));

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const addableItems = useMemo(
    () => stagedItems.filter((item) => item.name.trim() && item.category.trim()),
    [stagedItems],
  );

  function stageTranscript(transcript) {
    const itemNames = splitVoiceItems(transcript);

    if (itemNames.length === 0) {
      setMessage("Δεν άκουσα προϊόντα. Δοκίμασε ξανά με μικρές φράσεις.");
      return;
    }

    setStagedItems((current) => [...current, ...itemNames.map(buildStagedItem)]);
    setMessage(`Άκουσα ${itemNames.length} προϊόντα. Έλεγξέ τα πριν τα προσθέσεις.`);
  }

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setIsSupported(false);
      setMessage("Η φωνητική προσθήκη δεν υποστηρίζεται σε αυτόν τον browser.");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognition.lang = "el-GR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage("Ακούω στα ελληνικά...");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setMessage("Δεν μπόρεσα να ακούσω καθαρά. Δοκίμασε ξανά.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");

      stageTranscript(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function updateStagedName(itemId, name) {
    setStagedItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              category: name.trim() ? suggestCategory(name) : item.category,
              name,
            }
          : item,
      ),
    );
  }

  function updateStagedCategory(itemId, category) {
    setStagedItems((current) => current.map((item) => (item.id === itemId ? { ...item, category } : item)));
  }

  function removeStagedItem(itemId) {
    setStagedItems((current) => current.filter((item) => item.id !== itemId));
  }

  function addStagedItems() {
    if (addableItems.length === 0) {
      return;
    }

    onAddVoiceItems(addableItems);
    setStagedItems([]);
    setMessage("");
  }

  if (!isSupported) {
    return (
      <section className="voice-panel" aria-label="Φωνητική προσθήκη">
        <div className="section-label">Βρες το με Φωνή</div>
        <p className="voice-fallback">Η φωνητική προσθήκη δεν υποστηρίζεται σε αυτόν τον browser.</p>
      </section>
    );
  }

  return (
    <section className="voice-panel" aria-label="Φωνητική προσθήκη">
      <div className="section-label">Βρες το με Φωνή</div>
      <div className="voice-actions">
        <button type="button" onClick={isListening ? stopListening : startListening}>
          {isListening ? "Σταμάτα" : "Πες προϊόντα"}
        </button>
        {stagedItems.length > 0 ? (
          <button className="voice-clear" type="button" onClick={() => setStagedItems([])}>
            Καθαρισμός
          </button>
        ) : null}
      </div>

      {message ? <p className="voice-status">{message}</p> : null}

      {stagedItems.length > 0 ? (
        <div className="voice-stage">
          {stagedItems.map((item, index) => (
            <div className="voice-stage-row" key={item.id}>
              <input
                aria-label={`Φωνητικό προϊόν ${index + 1}`}
                value={item.name}
                onChange={(event) => updateStagedName(item.id, event.target.value)}
              />
              <select
                aria-label={`Κατηγορία για ${item.name || `προϊόν ${index + 1}`}`}
                value={item.category}
                onChange={(event) => updateStagedCategory(item.id, event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                className="voice-remove"
                type="button"
                aria-label={`Αφαίρεση ${item.name || `προϊόντος ${index + 1}`}`}
                onClick={() => removeStagedItem(item.id)}
              >
                ×
              </button>
            </div>
          ))}

          <button type="button" disabled={addableItems.length === 0} onClick={addStagedItems}>
            Προσθήκη {addableItems.length}
          </button>
        </div>
      ) : null}
    </section>
  );
}
