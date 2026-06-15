import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmModal } from "./components/ConfirmModal";
import { ControlsPanel } from "./components/ControlsPanel";
import { DashboardHeader } from "./components/DashboardHeader";
import { ScrollTopButton } from "./components/ScrollTopButton";
import { ShoppingCartPage } from "./components/ShoppingCartPage";
import { ShoppingList } from "./components/ShoppingList";
import { loadStoredState, saveStoredState } from "./storage";
import { normalizeText, suggestCategory } from "./utils/categories";
import { getRouteFromHash, navigateToHash, readCartSessionIds, writeCartSessionIds } from "./utils/routes";
import { buildInitialState, isValidState } from "./utils/state";

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
  const didFinishInitialLoad = useRef(false);

  useEffect(() => {
    function syncRouteFromHash() {
      setPage(getRouteFromHash());

      if (window.location.hash === "#/needed") {
        setView("needed");
      }
    }

    syncRouteFromHash();
    window.addEventListener("hashchange", syncRouteFromHash);

    return () => {
      window.removeEventListener("hashchange", syncRouteFromHash);
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
          setState(storedResult.state);
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

  function addItem(event) {
    event.preventDefault();

    const name = draftName.trim();
    const customCategory = newCategory.trim();
    const category = customCategory || (draftCategory === "auto" ? guessedCategory : draftCategory);

    if (!name || !category) {
      return;
    }

    setState((current) => {
      const categories = current.categories.includes(category) ? current.categories : [...current.categories, category];

      return {
        categories,
        items: [
          {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${name}`,
            name,
            category,
            status: "needed",
            createdAt: Date.now(),
          },
          ...current.items,
        ],
      };
    });

    setDraftName("");
    setDraftCategory("auto");
    setNewCategory("");
  }

  function addScannedItem({ barcode, category, name }) {
    const trimmedName = name.trim();

    if (!trimmedName || !category) {
      return;
    }

    setState((current) => {
      const categories = current.categories.includes(category) ? current.categories : [...current.categories, category];

      return {
        categories,
        items: [
          {
            barcode,
            category,
            createdAt: Date.now(),
            id: crypto.randomUUID?.() ?? `${Date.now()}-${trimmedName}`,
            name: trimmedName,
            status: "needed",
          },
          ...current.items,
        ],
      };
    });

    setQuery("");
    setView("all");
  }

  function addItemToCategory(event, category) {
    event.preventDefault();

    const name = quickAddName.trim();

    if (!name) {
      return;
    }

    setState((current) => ({
      ...current,
      items: [
        {
          id: crypto.randomUUID?.() ?? `${Date.now()}-${name}`,
          name,
          category,
          status: "needed",
          createdAt: Date.now(),
        },
        ...current.items,
      ],
    }));

    setQuickAddCategory("");
    setQuickAddName("");
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

  function updateItemQuantity(itemId, quantity) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
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
  }

  const pendingConfirmAction = pendingDeleteItem
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
    return <ShoppingCartPage items={cartItems} onBack={closeShoppingCart} onToggleTaken={toggleItemStatus} />;
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
          onUpdateItemQuantity={updateItemQuantity}
        />
      </section>

      <ConfirmModal
        action={pendingConfirmAction}
        onCancel={() => {
          setPendingDeleteItem(null);
          setPendingClearCompleted(false);
          setPendingResetList(false);
        }}
        onConfirm={() => {
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
      />
      <ScrollTopButton />
    </main>
  );
}

export default App;
