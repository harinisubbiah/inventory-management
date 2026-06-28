/* ==========================================================================
   storage.js
   --------------------------------------------------------------------------
   Thin wrapper around localStorage. Nothing else in the app touches
   localStorage directly — every read/write for inventory data, theme,
   auth state, and the activity log goes through this module.
   ========================================================================== */

const InventoryStorage = (() => {

  const KEYS = {
    INVENTORY: 'manifest-inventory',
    THEME: 'manifest-theme',
    AUTH: 'manifest-auth',
    ACTIVITY: 'manifest-activity-log',
  };

  const LOW_STOCK_THRESHOLD = 10;

  // Seed data so the dashboard isn't empty on first visit. Mirrors the
  // kind of small-hardware inventory the original C program managed.
  const SEED_PRODUCTS = [
    { name: 'Steel Hinge',             quantity: 240, price: 4.50 },
    { name: 'Hex Bolt M8',             quantity: 18,  price: 0.35 },
    { name: 'Ball Bearing 6mm',        quantity: 6,   price: 1.85 },
    { name: 'Copper Wire Spool 50m',   quantity: 32,  price: 22.00 },
    { name: 'PVC Pipe 1in (3m)',       quantity: 0,   price: 8.75 },
    { name: 'Welding Rod 3.2mm Pack',  quantity: 54,  price: 14.20 },
    { name: 'Safety Gloves (Pair)',    quantity: 120, price: 3.10 },
    { name: 'LED Work Light',          quantity: 9,   price: 17.99 },
    { name: 'Industrial Adhesive 250ml', quantity: 41, price: 6.40 },
    { name: 'Cable Tie Pack (100ct)',  quantity: 75,  price: 2.25 },
    { name: 'Stainless Screw Set',     quantity: 5,   price: 9.10 },
    { name: 'Rubber Gasket 4in',       quantity: 0,   price: 1.40 },
    { name: 'Aluminum Sheet 1m²',      quantity: 14,  price: 28.50 },
    { name: 'Power Drill Bit Set',     quantity: 22,  price: 19.99 },
  ];

  function generateId() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // -- Inventory --
  function loadInventory() {
    const raw = localStorage.getItem(KEYS.INVENTORY);
    if (!raw) {
      const seeded = SEED_PRODUCTS.map(p => ({
        id: generateId(),
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        updatedAt: Date.now(),
      }));
      saveInventory(seeded);
      return seeded;
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('InventoryStorage: corrupt inventory data, resetting.', err);
      return [];
    }
  }

  function saveInventory(items) {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
  }

  function clearInventory() {
    localStorage.removeItem(KEYS.INVENTORY);
  }

  function resetInventoryToSeed() {
    clearInventory();
    return loadInventory();
  }

  // -- Theme --
  function getTheme() {
    return localStorage.getItem(KEYS.THEME) || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
  }

  // -- Auth (frontend-only demo) --
  function isAuthenticated() {
    return localStorage.getItem(KEYS.AUTH) !== null;
  }

  function setAuthenticated(email) {
    localStorage.setItem(KEYS.AUTH, JSON.stringify({ email, since: Date.now() }));
  }

  function getAuthUser() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.AUTH));
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(KEYS.AUTH);
  }

  // -- Activity log --
  function loadActivityLog() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ACTIVITY)) || [];
    } catch {
      return [];
    }
  }

  function addActivityEntry(entry) {
    const log = loadActivityLog();
    log.unshift({
      id: generateId(),
      timestamp: Date.now(),
      ...entry,
    });
    // Keep the log from growing forever
    const trimmed = log.slice(0, 200);
    localStorage.setItem(KEYS.ACTIVITY, JSON.stringify(trimmed));
    return trimmed;
  }

  function clearActivityLog() {
    localStorage.removeItem(KEYS.ACTIVITY);
  }

  return {
    KEYS,
    LOW_STOCK_THRESHOLD,
    generateId,
    loadInventory,
    saveInventory,
    clearInventory,
    resetInventoryToSeed,
    getTheme,
    setTheme,
    isAuthenticated,
    setAuthenticated,
    getAuthUser,
    logout,
    loadActivityLog,
    addActivityEntry,
    clearActivityLog,
  };
})();
