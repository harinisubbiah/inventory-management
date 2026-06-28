/* ==========================================================================
   inventory.js
   --------------------------------------------------------------------------
   Core inventory logic — a direct port of the original C program's
   operations onto a plain JS array of product objects, persisted via
   InventoryStorage. Every mutating method records an activity-log
   entry and returns a { success, message, product? } result so the
   UI layer (app.js) can react and show a toast without this file
   knowing anything about the DOM.

   Product shape: { id, name, quantity, price, updatedAt }
   ========================================================================== */

const Inventory = (() => {

  let products = InventoryStorage.loadInventory();

  function persist() {
    InventoryStorage.saveInventory(products);
  }

  function normalize(name) {
    return name.trim().toLowerCase();
  }

  // -- Status, mirroring the C program's idea of stock levels --
  function getStatus(product) {
    if (product.quantity <= 0) return 'out-of-stock';
    if (product.quantity <= InventoryStorage.LOW_STOCK_THRESHOLD) return 'low-stock';
    return 'in-stock';
  }

  // -- Display complete inventory --
  function getAll() {
    return [...products];
  }

  function getById(id) {
    return products.find(p => p.id === id) || null;
  }

  // -- Search product (case-insensitive substring, "search as you type") --
  function search(query) {
    const q = normalize(query || '');
    if (!q) return getAll();
    return products.filter(p => normalize(p.name).includes(q));
  }

  // -- Duplicate detection: exact name match, case-insensitive --
  function findDuplicate(name) {
    const n = normalize(name);
    return products.find(p => normalize(p.name) === n) || null;
  }

  // -- Add new product --
  function addProduct(name, quantity, price) {
    const cleanName = (name || '').trim();
    quantity = Number(quantity);
    price = Number(price);

    if (!cleanName) {
      return { success: false, message: 'Product name is required.' };
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      return { success: false, message: 'Quantity must be a non-negative number.' };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { success: false, message: 'Price must be a non-negative number.' };
    }

    const duplicate = findDuplicate(cleanName);
    if (duplicate) {
      InventoryStorage.addActivityEntry({
        type: 'duplicate-blocked',
        productName: cleanName,
        detail: `Add blocked — "${cleanName}" already exists.`,
      });
      return { success: false, message: `"${cleanName}" already exists in inventory.`, duplicate: true };
    }

    const product = {
      id: InventoryStorage.generateId(),
      name: cleanName,
      quantity,
      price,
      updatedAt: Date.now(),
    };
    products.push(product);
    persist();

    InventoryStorage.addActivityEntry({
      type: 'add',
      productName: product.name,
      detail: `Added with quantity ${quantity} at $${price.toFixed(2)}.`,
    });

    return { success: true, message: `${product.name} added to inventory.`, product };
  }

  // -- Update quantity --
  function updateQuantity(id, newQuantity) {
    const product = getById(id);
    if (!product) return { success: false, message: 'Product not found.' };

    newQuantity = Number(newQuantity);
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      return { success: false, message: 'Quantity must be a non-negative number.' };
    }

    const previous = product.quantity;
    product.quantity = newQuantity;
    product.updatedAt = Date.now();
    persist();

    InventoryStorage.addActivityEntry({
      type: 'update-quantity',
      productName: product.name,
      detail: `Quantity changed from ${previous} to ${newQuantity}.`,
    });

    return { success: true, message: `${product.name} quantity updated.`, product };
  }

  // -- Update price --
  function updatePrice(id, newPrice) {
    const product = getById(id);
    if (!product) return { success: false, message: 'Product not found.' };

    newPrice = Number(newPrice);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      return { success: false, message: 'Price must be a non-negative number.' };
    }

    const previous = product.price;
    product.price = newPrice;
    product.updatedAt = Date.now();
    persist();

    InventoryStorage.addActivityEntry({
      type: 'update-price',
      productName: product.name,
      detail: `Price changed from $${previous.toFixed(2)} to $${newPrice.toFixed(2)}.`,
    });

    return { success: true, message: `${product.name} price updated.`, product };
  }

  // -- Convenience: update both at once (used by the edit modal) --
  function updateProduct(id, { quantity, price }) {
    const product = getById(id);
    if (!product) return { success: false, message: 'Product not found.' };

    const qtyChanged = quantity !== undefined && Number(quantity) !== product.quantity;
    const priceChanged = price !== undefined && Number(price) !== product.price;

    if (!qtyChanged && !priceChanged) {
      return { success: true, message: 'No changes to save.', product, unchanged: true };
    }

    if (qtyChanged) {
      const r = updateQuantity(id, quantity);
      if (!r.success) return r;
    }
    if (priceChanged) {
      const r = updatePrice(id, price);
      if (!r.success) return r;
    }

    return { success: true, message: `${product.name} updated.`, product: getById(id) };
  }

  // -- Delete product --
  function removeProduct(id) {
    const product = getById(id);
    if (!product) return { success: false, message: 'Product not found.' };

    products = products.filter(p => p.id !== id);
    persist();

    InventoryStorage.addActivityEntry({
      type: 'delete',
      productName: product.name,
      detail: `Removed from inventory.`,
    });

    return { success: true, message: `${product.name} deleted.`, product };
  }

  // -- Calculate total inventory value: sum(qty * price) --
  function getTotalValue() {
    return products.reduce((sum, p) => sum + p.quantity * p.price, 0);
  }

  function getLowStockItems() {
    return products.filter(p => getStatus(p) === 'low-stock' || getStatus(p) === 'out-of-stock');
  }

  function getRecentlyUpdated(withinMs = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - withinMs;
    return products
      .filter(p => p.updatedAt >= cutoff)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function reload() {
    products = InventoryStorage.loadInventory();
  }

  return {
    getAll,
    getById,
    search,
    findDuplicate,
    addProduct,
    updateQuantity,
    updatePrice,
    updateProduct,
    removeProduct,
    getStatus,
    getTotalValue,
    getLowStockItems,
    getRecentlyUpdated,
    reload,
  };
})();
