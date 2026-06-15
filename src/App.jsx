import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmModal } from "./components/ConfirmModal";
import { ControlsPanel } from "./components/ControlsPanel";
import { DashboardHeader } from "./components/DashboardHeader";
import { ScrollTopButton } from "./components/ScrollTopButton";
import { ShoppingCartPage } from "./components/ShoppingCartPage";
import { ShoppingList } from "./components/ShoppingList";
import { loadStoredState, saveStoredState } from "./storage";
import { normalizeText, suggestCategory } from "./utils/categories";
import { getRouteFromHash, getViewFromHash, navigateToHash, readCartSessionIds, writeCartSessionIds } from "./utils/routes";
import { normalizeScannedCode } from "./utils/scanner";
import { buildInitialState, isValidState, normalizeState } from "./utils/state";
import { getQuantityNote, normalizeQuantityCount } from "./utils/quantity";

function createShoppingItem({ barcode, category, estimatedPrice = "", name, quantityCount = 1, quantityNote = "" }) {
  return {
    barcode,
    category,
    createdAt: Date.now(),
    estimatedPrice,
    id: crypto.randomUUID?.() ?? `${Date.now()}-${name}`,
    name,
    quantityCount: normalizeQuantityCount(quantityCount),
    quantityNote,
    status: "needed",
  };
}

function findDuplicateItem(items, incomingItem) {
  const incomingBarcode = normalizeScannedCode(incomingItem.barcode);

  if (incomingBarcode) {
    const barcodeMatch = items.find((item) => normalizeScannedCode(item.barcode) === incomingBarcode);

    if (barcodeMatch) {
      return { item: barcodeMatch, matchType: "barcode" };
    }
  }

  const incomingName = normalizeText(incomingItem.name);

  if (!incomingName) {
    return null;
  }

  const nameMatch = items.find((item) => normalizeText(item.name) === incomingName);

  return nameMatch ? { item: nameMatch, matchType: "name" } : null;
}

function mergeQuantityNote(existingItem, incomingItem) {
  const existingNote = getQuantityNote(existingItem).trim();
  const incomingNote = getQuantityNote(incomingItem).trim();

  if (!incomingNote || existingNote === incomingNote) {
    return existingNote;
  }

  if (!existingNote) {
    return incomingNote;
  }

  return `${existingNote}; ${incomingNote}`;
}

function applyLearnedProduct(current, learnedProduct) {
  if (!learnedProduct) {
    return current.learnedProducts ?? {};
  }

  return {
    ...current.learnedProducts,
    [learnedProduct.code]: learnedProduct,
  };
}

function addItemPayloadToState(current, payload) {
  const categories = current.categories.includes(payload.item.category)
    ? current.categories
    : [...current.categories, payload.item.category];

  return {
    ...current,
    categories,
    learnedProducts: applyLearnedProduct(current, payload.learnedProduct),
    items: [payload.item, ...current.items],
  };
}

function increaseDuplicateQuantityInState(current, pendingDuplicate) {
  const existingItemId = pendingDuplicate.existingItem.id;
  const incomingItem = pendingDuplicate.payload.item;
  const incomingCount = normalizeQuantityCount(incomingItem.quantityCount);
  const hasExistingItem = current.items.some((item) => item.id === existingItemId);

  if (!hasExistingItem) {
    return addItemPayloadToState(current, pendingDuplicate.payload);
  }

  return {
    ...current,
    learnedProducts: applyLearnedProduct(current, pendingDuplicate.payload.learnedProduct),
    items: current.items.map((item) =>
      item.id === existingItemId
        ? {
            ...item,
            quantityCount: normalizeQuantityCount(item.quantityCount) + incomingCount,
            quantityNote: mergeQuantityNote(item, incomingItem),
            status: "needed",
          }
        : item,
    ),
  };
}

function App() {
  const [state, setState] = useState(buildInitialState);
  const [storageReady, setStorageReady] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("auto");
  const [newCategory, setNewCategory] = useState("");
  const [quickAddCategory, setQuickAddCategory] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [page, setPage] = useState(getRouteFromHash);
  const [cartItemIds, setCartItemIds] = useState(readCartSessionIds);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
  const [pendingClearCompleted, setPendingClearCompleted] = useState(false);
  const [pendingResetList, setPendingResetList] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState(null);
  const [pendingVoiceItems, setPendingVoiceItems] = useState([]);
  const didFinishInitialLoad = useRef(false);

  useEffect(() => {
    function syncRouteFromHash() {
      setPage(getRouteFromHash());

      const routeView = getViewFromHash();

      if (routeView) {
        setView(routeView);
      }
    }

    syncRouteFromHash();
    globalThis.addEventListener("hashchange", syncRouteFromHash);

    return () => {
      globalThis.removeEventListener("hashchange", syncRouteFromHash);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadStoredState()
      .then((storedResult) => {
        if (!isMounted) {
          return;
        }

        if (isValidState(storedResult?.state)) {
          setState(normalizeState(storedResult.state));
        }

        setStorageReady(true);
      })
      .catch(() => {
        if (isMounted) {
          setStorageReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    if (!didFinishInitialLoad.current) {
      didFinishInitialLoad.current = true;
      return;
    }

    saveStoredState(state).catch(() => {
      // The storage layer already falls back locally; no user-blocking action is needed here.
    });
  }, [state, storageReady]);

  useEffect(() => {
    if (!storageReady || page !== "cart" || cartItemIds.length > 0) {
      return;
    }

    const neededItemIds = state.items.filter((item) => item.status === "needed").map((item) => item.id);

    if (neededItemIds.length > 0) {
      setCartItemIds(neededItemIds);
      writeCartSessionIds(neededItemIds);
    }
  }, [cartItemIds.length, page, state.items, storageReady]);

  useEffect(() => {
    if (pendingDuplicate || pendingVoiceItems.length === 0) {
      return;
    }

    addOrQueueDuplicate(pendingVoiceItems[0], "voice");
    setPendingVoiceItems((current) => current.slice(1));
  }, [pendingDuplicate, pendingVoiceItems, state.items]);

  const guessedCategory = useMemo(() => {
    return draftName ? suggestCategory(draftName) : "Να μην ξεχάσω";
  }, [draftName]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return state.items.filter((item) => {
      const matchesView = view === "all" || item.status === view;
      const matchesSearch =
        normalizeText(item.name).includes(normalizedQuery) ||
        normalizeText(item.category).includes(normalizedQuery);

      return matchesView && matchesSearch;
    });
  }, [query, state.items, view]);

  const itemsByCategory = useMemo(() => {
    return state.categories
      .map((category) => ({
        category,
        items: visibleItems
          .filter((item) => item.category === category)
          .sort((a, b) => a.name.localeCompare(b.name, "el")),
      }))
      .filter((group) => group.items.length > 0);
  }, [state.categories, visibleItems]);

  const totals = useMemo(() => {
    return state.items.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        acc.all += 1;
        return acc;
      },
      { all: 0, needed: 0, notNeeded: 0, have: 0 },
    );
  }, [state.items]);

  const cartItems = useMemo(() => {
    const cartIdSet = new Set(cartItemIds);

    return state.items
      .filter((item) => cartIdSet.has(item.id) && item.status !== "notNeeded")
      .sort((a, b) => {
        const categorySort = state.categories.indexOf(a.category) - state.categories.indexOf(b.category);
        return categorySort || a.name.localeCompare(b.name, "el");
      });
  }, [cartItemIds, state.categories, state.items]);

  function clearAddFlow(source) {
    if (source === "manual") {
      setDraftName("");
      setDraftCategory("auto");
      setNewCategory("");
      return;
    }

    if (source === "quick") {
      setQuickAddCategory("");
      setQuickAddName("");
      return;
    }

    if (source === "scanned") {
      setQuery("");
      setView("all");
    }
  }

  function addOrQueueDuplicate(payload, source) {
    const duplicate = findDuplicateItem(state.items, payload.item);

    if (duplicate) {
      setPendingDuplicate({
        existingItem: duplicate.item,
        matchType: duplicate.matchType,
        payload,
        source,
      });
      return false;
    }

    setState((current) => addItemPayloadToState(current, payload));
    clearAddFlow(source);
    return true;
  }

  function confirmIncreaseDuplicateQuantity() {
    if (!pendingDuplicate) {
      return;
    }

    setState((current) => increaseDuplicateQuantityInState(current, pendingDuplicate));
    clearAddFlow(pendingDuplicate.source);
    setPendingDuplicate(null);
  }

  function confirmAddDuplicateSeparately() {
    if (!pendingDuplicate) {
      return;
    }

    setState((current) => addItemPayloadToState(current, pendingDuplicate.payload));
    clearAddFlow(pendingDuplicate.source);
    setPendingDuplicate(null);
  }

  function addItem(event) {
    event.preventDefault();

    const name = draftName.trim();
    const customCategory = newCategory.trim();
    const category = customCategory || (draftCategory === "auto" ? guessedCategory : draftCategory);

    if (!name || !category) {
      return;
    }

    addOrQueueDuplicate(
      {
        item: createShoppingItem({
          category,
          name,
          quantityCount: 1,
          quantityNote: "",
        }),
      },
      "manual",
    );
  }

  function addScannedItem({ barcode, category, name }) {
    const trimmedName = name.trim();
    const normalizedBarcode = normalizeScannedCode(barcode);

    if (!trimmedName || !category) {
      return;
    }

    addOrQueueDuplicate(
      {
        item: createShoppingItem({
          barcode: normalizedBarcode || barcode,
          category,
          name: trimmedName,
          quantityCount: 1,
          quantityNote: "",
        }),
        learnedProduct: normalizedBarcode
          ? {
              category,
              code: normalizedBarcode,
              name: trimmedName,
              updatedAt: new Date().toISOString(),
            }
          : null,
      },
      "scanned",
    );
  }

  function addVoiceItems(stagedItems) {
    const payloads = stagedItems
      .map((stagedItem) => {
        const name = stagedItem.name.trim();
        const category = stagedItem.category?.trim() || suggestCategory(name);

        if (!name || !category) {
          return null;
        }

        return {
          item: createShoppingItem({
            category,
            name,
            quantityCount: 1,
            quantityNote: "",
          }),
        };
      })
      .filter(Boolean);

    if (payloads.length === 0) {
      return;
    }

    setPendingVoiceItems((current) => [...current, ...payloads]);
  }

  function addItemToCategory(event, category) {
    event.preventDefault();

    const name = quickAddName.trim();

    if (!name) {
      return;
    }

    addOrQueueDuplicate(
      {
        item: createShoppingItem({
          category,
          name,
          quantityCount: 1,
          quantityNote: "",
        }),
      },
      "quick",
    );
  }

  function toggleQuickAdd(category) {
    setQuickAddCategory((currentCategory) => (currentCategory === category ? "" : category));
    setQuickAddName("");
  }

  function toggleItemStatus(itemId) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, status: item.status === "have" ? "needed" : "have" } : item,
      ),
    }));
  }

  function toggleNotNeededStatus(itemId) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, status: item.status === "notNeeded" ? "needed" : "notNeeded" } : item,
      ),
    }));
  }

  function updateItemQuantityCount(itemId, quantityCount) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, quantityCount: normalizeQuantityCount(quantityCount) } : item,
      ),
    }));
  }

  function updateItemQuantityNote(itemId, quantityNote) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, quantityNote } : item)),
    }));
  }

  function updateItemEstimatedPrice(itemId, estimatedPrice) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, estimatedPrice } : item)),
    }));
  }

  function openShoppingCart() {
    const neededItemIds = state.items.filter((item) => item.status === "needed").map((item) => item.id);
    setCartItemIds(neededItemIds);
    writeCartSessionIds(neededItemIds);
    navigateToHash("#/cart");
  }

  function closeShoppingCart() {
    navigateToHash("#/needed");
  }

  function finishShopping() {
    navigateToHash("#/have");
  }

  function confirmRemoveItem() {
    if (!pendingDeleteItem) {
      return;
    }

    setState((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== pendingDeleteItem.id),
    }));
    setPendingDeleteItem(null);
  }

  function clearCompleted() {
    setState((current) => ({
      ...current,
      items: current.items.filter((item) => item.status !== "have"),
    }));
  }

  function resetList() {
    setState(buildInitialState());
    setQuery("");
    setView("all");
    setQuickAddCategory("");
    setQuickAddName("");
    setCartItemIds([]);
    writeCartSessionIds([]);
    navigateToHash("#/");
    setPendingDeleteItem(null);
    setPendingClearCompleted(false);
    setPendingResetList(false);
    setPendingDuplicate(null);
    setPendingVoiceItems([]);
  }

  const pendingConfirmAction = pendingDuplicate
    ? {
        confirmClassName: "modal-primary",
        confirmLabel: "Αύξηση ποσότητας",
        eyebrow: "Πιθανό διπλό προϊόν",
        message: (
          <>
            Το <strong>{pendingDuplicate.payload.item.name}</strong> μοιάζει να υπάρχει ήδη στη λίστα ως{" "}
            <strong>{pendingDuplicate.existingItem.name}</strong>. Το βρήκα από{" "}
            {pendingDuplicate.matchType === "barcode" ? "barcode" : "όνομα"}.
          </>
        ),
        secondaryLabel: "Βάλ' το ξεχωριστά",
        title: "Να χρησιμοποιήσω το υπάρχον προϊόν;",
      }
    : pendingDeleteItem
    ? {
        confirmLabel: "Διαγραφή",
        eyebrow: "Επιβεβαίωση διαγραφής",
        message: (
          <>
            Θέλεις όντως να διαγράψεις το <strong>{pendingDeleteItem.name}</strong> από την κατηγορία{" "}
            <strong>{pendingDeleteItem.category}</strong>;
          </>
        ),
        title: "Να διαγραφεί αυτό το προϊόν;",
      }
    : pendingClearCompleted
      ? {
          confirmLabel: "Καθάρισε",
          eyebrow: "Επιβεβαίωση καθαρισμού",
          message: `Θέλεις όντως να αφαιρεθούν ${totals.have} προϊόντα που έχεις ήδη σπίτι;`,
          title: "Να καθαριστούν όσα έχω;",
        }
      : pendingResetList
        ? {
            confirmLabel: "Reset",
            eyebrow: "Επιβεβαίωση reset",
            message: "Θέλεις όντως να σβηστεί η τωρινή λίστα και να επανέλθει η demo λίστα;",
            title: "Να γίνει reset της λίστας;",
          }
      : null;

  if (page === "cart") {
    return (
      <ShoppingCartPage
        items={cartItems}
        onBack={closeShoppingCart}
        onFinishShopping={finishShopping}
        onToggleTaken={toggleItemStatus}
        onUpdateItemEstimatedPrice={updateItemEstimatedPrice}
      />
    );
  }

  return (
    <main className="app-shell">
      <DashboardHeader totals={totals} view={view} onOpenCart={openShoppingCart} onViewChange={setView} />

      <section className="workspace">
        <ControlsPanel
          categories={state.categories}
          draftCategory={draftCategory}
          draftName={draftName}
          guessedCategory={guessedCategory}
          newCategory={newCategory}
          query={query}
          view={view}
          onAddItem={addItem}
          onAddScannedItem={addScannedItem}
          onAddVoiceItems={addVoiceItems}
          onClearCompleted={() => setPendingClearCompleted(true)}
          onDraftCategoryChange={setDraftCategory}
          onDraftNameChange={setDraftName}
          onNewCategoryChange={setNewCategory}
          onQueryChange={setQuery}
          onResetList={() => setPendingResetList(true)}
          onViewChange={setView}
        />

        <ShoppingList
          itemsByCategory={itemsByCategory}
          view={view}
          quickAddCategory={quickAddCategory}
          quickAddName={quickAddName}
          onAddItemToCategory={addItemToCategory}
          onQuickAddNameChange={setQuickAddName}
          onRequestRemoveItem={setPendingDeleteItem}
          onToggleItemStatus={toggleItemStatus}
          onToggleNotNeededStatus={toggleNotNeededStatus}
          onToggleQuickAdd={toggleQuickAdd}
          onUpdateItemEstimatedPrice={updateItemEstimatedPrice}
          onUpdateItemQuantityCount={updateItemQuantityCount}
          onUpdateItemQuantityNote={updateItemQuantityNote}
        />
      </section>

      <ConfirmModal
        action={pendingConfirmAction}
        onCancel={() => {
          setPendingDuplicate(null);
          setPendingDeleteItem(null);
          setPendingClearCompleted(false);
          setPendingResetList(false);
        }}
        onConfirm={() => {
          if (pendingDuplicate) {
            confirmIncreaseDuplicateQuantity();
            return;
          }

          if (pendingDeleteItem) {
            confirmRemoveItem();
            return;
          }

          if (pendingClearCompleted) {
            clearCompleted();
            setPendingClearCompleted(false);
            return;
          }

          if (pendingResetList) {
            resetList();
          }
        }}
        onSecondary={() => {
          if (pendingDuplicate) {
            confirmAddDuplicateSeparately();
          }
        }}
      />
      <ScrollTopButton />
    </main>
  );
}

export default App;
