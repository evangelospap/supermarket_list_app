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

const PRICE_FIELDS_STORAGE_KEY = "supermarket-show-price-fields";
const MAX_HOME_SNAPSHOTS = 20;

function readStoredPriceFieldsVisibility() {
  try {
    return globalThis.localStorage?.getItem(PRICE_FIELDS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredPriceFieldsVisibility(isVisible) {
  try {
    globalThis.localStorage?.setItem(PRICE_FIELDS_STORAGE_KEY, String(isVisible));
  } catch {
    // Local UI preference only; ignore unavailable storage.
  }
}

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
  const matches = items
    .map((item) => ({
      item,
      matchType: getProductMatchType(item, incomingItem),
    }))
    .filter((match) => match.matchType);

  return (
    matches.find((match) => match.item.status === incomingItem.status) ??
    matches.find((match) => match.item.status !== "have") ??
    null
  );
}

function getProductMatchType(item, incomingItem) {
  const incomingBarcode = normalizeScannedCode(incomingItem.barcode);
  const itemBarcode = normalizeScannedCode(item.barcode);

  if (incomingBarcode && itemBarcode === incomingBarcode) {
    return "barcode";
  }

  const incomingName = normalizeText(incomingItem.name);

  if (incomingName && normalizeText(item.name) === incomingName) {
    return "name";
  }

  return null;
}

function findMatchingProductItem(items, targetItem, { excludeId, status } = {}) {
  return items.find(
    (item) =>
      item.id !== excludeId &&
      (!status || item.status === status) &&
      Boolean(getProductMatchType(item, targetItem)),
  );
}

function mergeItemQuantity(existingItem, incomingItem, status = existingItem.status) {
  return {
    ...existingItem,
    barcode: existingItem.barcode || incomingItem.barcode,
    estimatedPrice: existingItem.estimatedPrice || incomingItem.estimatedPrice,
    quantityCount: normalizeQuantityCount(existingItem.quantityCount) + normalizeQuantityCount(incomingItem.quantityCount),
    quantityNote: mergeQuantityNote(existingItem, incomingItem),
    status,
  };
}

function addOrIncreaseNeededItemInState(current, payload) {
  const existingNeededItem = findMatchingProductItem(current.items, payload.item, { status: "needed" });

  if (!existingNeededItem) {
    return addItemPayloadToState(current, payload);
  }

  return {
    ...current,
    learnedProducts: applyLearnedProduct(current, payload.learnedProduct),
    items: current.items.map((item) =>
      item.id === existingNeededItem.id ? mergeItemQuantity(item, payload.item, "needed") : item,
    ),
  };
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

function buildNeededCounterpartPayload(payload, existingHaveItem) {
  if (!existingHaveItem) {
    return payload;
  }

  return {
    ...payload,
    item: {
      ...payload.item,
      barcode: payload.item.barcode || existingHaveItem.barcode,
      category: existingHaveItem.category,
      estimatedPrice: payload.item.estimatedPrice || existingHaveItem.estimatedPrice,
    },
  };
}

function buildHomeSnapshot(items) {
  const snapshotItems = items
    .filter((item) => item.status === "have")
    .map((item) => ({
      barcode: item.barcode,
      category: item.category,
      estimatedPrice: item.estimatedPrice,
      id: item.id,
      name: item.name,
      quantityCount: normalizeQuantityCount(item.quantityCount),
      quantityNote: getQuantityNote(item),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "el") || a.name.localeCompare(b.name, "el"));

  if (snapshotItems.length === 0) {
    return null;
  }

  return {
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID?.() ?? `home-${Date.now()}`,
    items: snapshotItems,
  };
}

function formatSnapshotDate(value) {
  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Άγνωστη ώρα";
  }
}

function mergeHaveItemsIntoNeeded(items) {
  return items.reduce((nextItems, item) => {
    if (item.status !== "have") {
      return [...nextItems, item];
    }

    const neededMatchIndex = nextItems.findIndex(
      (existingItem) => existingItem.status === "needed" && getProductMatchType(existingItem, item),
    );

    if (neededMatchIndex === -1) {
      return [...nextItems, { ...item, status: "needed" }];
    }

    return nextItems.map((existingItem, index) =>
      index === neededMatchIndex ? mergeItemQuantity(existingItem, item, "needed") : existingItem,
    );
  }, []);
}

function resetHaveItemsAndRecordSnapshot(current) {
  const snapshot = buildHomeSnapshot(current.items);

  return {
    ...current,
    homeSnapshots: snapshot ? [snapshot, ...(current.homeSnapshots ?? [])].slice(0, MAX_HOME_SNAPSHOTS) : current.homeSnapshots ?? [],
    items: mergeHaveItemsIntoNeeded(current.items),
  };
}

function addNeededItemMerging(items, neededItem) {
  const neededMatchIndex = items.findIndex(
    (existingItem) => existingItem.status === "needed" && getProductMatchType(existingItem, neededItem),
  );

  if (neededMatchIndex === -1) {
    return [...items, neededItem];
  }

  return items.map((existingItem, index) =>
    index === neededMatchIndex ? mergeItemQuantity(existingItem, neededItem, "needed") : existingItem,
  );
}

function createRestoredHaveItem(snapshotItem, existingItem) {
  return {
    ...existingItem,
    barcode: snapshotItem.barcode || existingItem?.barcode,
    category: snapshotItem.category,
    createdAt: existingItem?.createdAt ?? Date.now(),
    estimatedPrice: snapshotItem.estimatedPrice ?? existingItem?.estimatedPrice ?? "",
    id: existingItem?.id ?? crypto.randomUUID?.() ?? `home-restore-${Date.now()}-${snapshotItem.name}`,
    name: snapshotItem.name,
    quantityCount: normalizeQuantityCount(snapshotItem.quantityCount),
    quantityNote: getQuantityNote(snapshotItem),
    status: "have",
  };
}

function restoreHomeSnapshot(current, snapshotId) {
  const snapshot = (current.homeSnapshots ?? []).find((entry) => entry.id === snapshotId);

  if (!snapshot) {
    return current;
  }

  const snapshotItems = snapshot.items ?? [];
  const restoredSnapshotIndexes = new Set();

  const itemsWithRestoredHave = current.items.reduce((nextItems, item) => {
    if (item.status !== "have") {
      return [...nextItems, item];
    }

    const snapshotIndex = snapshotItems.findIndex(
      (snapshotItem, index) => !restoredSnapshotIndexes.has(index) && getProductMatchType(item, snapshotItem),
    );

    if (snapshotIndex === -1) {
      return addNeededItemMerging(nextItems, { ...item, status: "needed" });
    }

    restoredSnapshotIndexes.add(snapshotIndex);
    return [...nextItems, createRestoredHaveItem(snapshotItems[snapshotIndex], item)];
  }, []);

  const missingRestoredItems = snapshotItems
    .filter((_, index) => !restoredSnapshotIndexes.has(index))
    .map((snapshotItem) => createRestoredHaveItem(snapshotItem));

  const snapshotCategories = snapshotItems.map((item) => item.category).filter(Boolean);

  return {
    ...current,
    categories: [...new Set([...current.categories, ...snapshotCategories])],
    items: [...missingRestoredItems, ...itemsWithRestoredHave],
  };
}

function increaseDuplicateQuantityInState(current, pendingDuplicate) {
  const existingItemId = pendingDuplicate.existingItem.id;
  const incomingItem = pendingDuplicate.payload.item;
  const hasExistingItem = current.items.some((item) => item.id === existingItemId);

  if (!hasExistingItem) {
    return addItemPayloadToState(current, pendingDuplicate.payload);
  }

  return {
    ...current,
    learnedProducts: applyLearnedProduct(current, pendingDuplicate.payload.learnedProduct),
    items: current.items.map((item) =>
      item.id === existingItemId ? mergeItemQuantity(item, incomingItem, "needed") : item,
    ),
  };
}

function mergeBoughtItemIntoStock(current, itemId) {
  const itemToMarkHave = current.items.find((item) => item.id === itemId);

  if (!itemToMarkHave || itemToMarkHave.status === "have") {
    return {
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, status: "needed" } : item)),
    };
  }

  const existingHaveItem = findMatchingProductItem(current.items, itemToMarkHave, {
    excludeId: itemId,
    status: "have",
  });

  if (!existingHaveItem) {
    return {
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, status: "have" } : item)),
    };
  }

  return {
    ...current,
    items: current.items
      .map((item) => (item.id === existingHaveItem.id ? mergeItemQuantity(item, itemToMarkHave, "have") : item))
      .filter((item) => item.id !== itemId),
  };
}

function App() {
  const [state, setState] = useState(buildInitialState);
  const [storageReady, setStorageReady] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("auto");
  const [draftQuantityCount, setDraftQuantityCount] = useState("1");
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
  const [pendingRestoreSnapshot, setPendingRestoreSnapshot] = useState(null);
  const [pendingDuplicate, setPendingDuplicate] = useState(null);
  const [pendingVoiceItems, setPendingVoiceItems] = useState([]);
  const [showPriceFields, setShowPriceFields] = useState(readStoredPriceFieldsVisibility);
  const didFinishInitialLoad = useRef(false);
  const productsSectionRef = useRef(null);

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
      setDraftQuantityCount("1");
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

    const existingHaveItem = findMatchingProductItem(state.items, payload.item, { status: "have" });
    const nextPayload = buildNeededCounterpartPayload(payload, existingHaveItem);

    setState((current) => addOrIncreaseNeededItemInState(current, nextPayload));
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
          quantityCount: normalizeQuantityCount(Number(draftQuantityCount)),
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
    setState((current) => mergeBoughtItemIntoStock(current, itemId));
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

  function togglePriceFields() {
    setShowPriceFields((current) => {
      const next = !current;
      writeStoredPriceFieldsVisibility(next);
      return next;
    });
  }

  function scrollToProductsOnMobile() {
    if (!globalThis.matchMedia?.("(max-width: 920px)").matches) {
      return;
    }

    globalThis.requestAnimationFrame(() => {
      const prefersReducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      productsSectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function changeViewFromNavigation(nextView) {
    setView(nextView);
    scrollToProductsOnMobile();
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

  function resetHaveItems() {
    setState((current) => resetHaveItemsAndRecordSnapshot(current));
    setQuery("");
    setView("needed");
    navigateToHash("#/needed");
    setPendingDeleteItem(null);
    setPendingClearCompleted(false);
    setPendingResetList(false);
    setPendingRestoreSnapshot(null);
    setPendingDuplicate(null);
    setPendingVoiceItems([]);
  }

  function restoreSnapshot() {
    if (!pendingRestoreSnapshot) {
      return;
    }

    setState((current) => restoreHomeSnapshot(current, pendingRestoreSnapshot.id));
    setQuery("");
    setView("have");
    navigateToHash("#/have");
    setPendingDeleteItem(null);
    setPendingClearCompleted(false);
    setPendingResetList(false);
    setPendingRestoreSnapshot(null);
    setPendingDuplicate(null);
    setPendingVoiceItems([]);
  }

  const resetHaveItemsConfirmAction = {
    cancelLabel: "Άκυρο",
    confirmLabel: "Reset Έχω σπίτι",
    eyebrow: "Επιβεβαίωση reset",
    message:
      "Θέλεις να αποθηκευτεί πρώτα καταγραφή του Έχω σπίτι και μετά να επιστρέψουν τα προϊόντα στο Χρειάζομαι; Θα κρατηθούν ποσότητες, σημειώσεις, τιμές και barcode στο ιστορικό.",
    title: "Reset για όσα έχω σπίτι;",
  };

  const pendingConfirmAction = pendingResetList
    ? resetHaveItemsConfirmAction
    : pendingRestoreSnapshot
    ? {
        confirmClassName: "modal-primary",
        confirmLabel: "Επαναφορά",
        eyebrow: "Επαναφορά snapshot",
        message: (
          <>
            Θέλεις να επαναφέρεις την καταγραφή <strong>{formatSnapshotDate(pendingRestoreSnapshot.createdAt)}</strong> ως το τρέχον{" "}
            <strong>Έχω σπίτι</strong>; Θα κρατηθούν οι ποσότητες, σημειώσεις, τιμές και barcodes του snapshot.
          </>
        ),
        title: "Να γίνει restore του σπιτιού;",
      }
    : pendingDuplicate
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
      : null;

  if (page === "cart") {
    return (
      <ShoppingCartPage
        items={cartItems}
        onBack={closeShoppingCart}
        onFinishShopping={finishShopping}
        onTogglePriceFields={togglePriceFields}
        onToggleTaken={toggleItemStatus}
        onUpdateItemEstimatedPrice={updateItemEstimatedPrice}
        showPriceFields={showPriceFields}
      />
    );
  }

  return (
    <main className="app-shell">
      <DashboardHeader totals={totals} view={view} onOpenCart={openShoppingCart} onViewChange={changeViewFromNavigation} />

      <section className="workspace">
        <ControlsPanel
          categories={state.categories}
          draftCategory={draftCategory}
          draftName={draftName}
          draftQuantityCount={draftQuantityCount}
          guessedCategory={guessedCategory}
          homeSnapshots={state.homeSnapshots ?? []}
          newCategory={newCategory}
          query={query}
          view={view}
          onAddItem={addItem}
          onAddScannedItem={addScannedItem}
          onAddVoiceItems={addVoiceItems}
          onClearCompleted={() => setPendingClearCompleted(true)}
          onDraftCategoryChange={setDraftCategory}
          onDraftNameChange={setDraftName}
          onDraftQuantityCountChange={setDraftQuantityCount}
          onNewCategoryChange={setNewCategory}
          onQueryChange={setQuery}
          onResetList={() => setPendingResetList(true)}
          onRestoreHomeSnapshot={setPendingRestoreSnapshot}
          onTogglePriceFields={togglePriceFields}
          onViewChange={changeViewFromNavigation}
          showPriceFields={showPriceFields}
        />

        <ShoppingList
          itemsByCategory={itemsByCategory}
          productsSectionRef={productsSectionRef}
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
          showPriceFields={showPriceFields}
        />
      </section>

      <ConfirmModal
        action={pendingConfirmAction}
        onCancel={() => {
          setPendingDuplicate(null);
          setPendingDeleteItem(null);
          setPendingClearCompleted(false);
          setPendingResetList(false);
          setPendingRestoreSnapshot(null);
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
            resetHaveItems();
            return;
          }

          if (pendingRestoreSnapshot) {
            restoreSnapshot();
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
