// 共用資料與 UI 工具；各頁載入 config.js 後使用。
window.DrinkApp = (() => {
  const client = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function showMessage(element, text, type = "ok") {
    element.textContent = text;
    element.className = text ? `message ${type}` : "message";
  }

  function productSizes(product) {
    if (!product) return [];
    const sizes = [["M", product.price_m], ["L", product.price_l]]
      .filter(([, price]) => price != null);
    // 舊菜單只儲存 price，必須保留相容。
    if (!sizes.length && product.price != null) sizes.push(["單一價", product.price]);
    return sizes.map(([size, price]) => ({ size, price: Number(price) }))
      .filter(item => Number.isSafeInteger(item.price) && item.price >= 0);
  }

  function quantity(value) {
    const number = Number(value);
    return Number.isInteger(number) ? Math.min(99, Math.max(1, number)) : 1;
  }

  function menuSort(a, b) {
    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
      String(a.name).localeCompare(String(b.name), "zh-TW");
  }

  // 分頁讀取，避免訂單超過 API 單次上限後統計不完整。
  // 呼叫端必須提供穩定排序（例如 id）。
  async function readAll(makeQuery) {
    const rows = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await makeQuery().range(offset, offset + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return rows;
    }
  }

  async function withButton(button, action, onError) {
    if (button.disabled) return;
    button.disabled = true;
    try {
      await action();
    } catch (error) {
      console.error(error);
      onError(error);
    } finally {
      button.disabled = false;
    }
  }

  return { client, escapeHtml, showMessage, productSizes, quantity, menuSort, readAll, withButton };
})();
