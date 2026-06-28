/* ==========================================================================
   analytics.js
   --------------------------------------------------------------------------
   Pure calculation layer for analytics.html — takes the current
   inventory and derives the metrics shown as animated cards. No DOM
   access here; rendering is handled by the inline script in
   analytics.html so this stays reusable/testable on its own.
   ========================================================================== */

const Analytics = (() => {

  function compute(products) {
    if (!products.length) {
      return {
        totalValue: 0,
        averagePrice: 0,
        highestPriced: null,
        lowestPriced: null,
        highestQuantity: null,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalProducts: 0,
      };
    }

    const totalValue = products.reduce((s, p) => s + p.quantity * p.price, 0);
    const averagePrice = products.reduce((s, p) => s + p.price, 0) / products.length;

    const highestPriced = products.reduce((a, b) => (b.price > a.price ? b : a));
    const lowestPriced = products.reduce((a, b) => (b.price < a.price ? b : a));
    const highestQuantity = products.reduce((a, b) => (b.quantity > a.quantity ? b : a));

    const lowStockCount = products.filter(p => Inventory.getStatus(p) === 'low-stock').length;
    const outOfStockCount = products.filter(p => Inventory.getStatus(p) === 'out-of-stock').length;

    return {
      totalValue,
      averagePrice,
      highestPriced,
      lowestPriced,
      highestQuantity,
      lowStockCount,
      outOfStockCount,
      totalProducts: products.length,
    };
  }

  return { compute };
})();
