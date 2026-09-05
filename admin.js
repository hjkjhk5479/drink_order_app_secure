(() => {
  const { client, escapeHtml: html, showMessage, productSizes, readAll, withButton } = DrinkApp;
  const el = Object.fromEntries([
    "tbody", "overview", "summary", "refreshBtn", "deleteAllBtn", "copyBtn", "logoutBtn",
    "storeTable", "manageStore", "storeMessage", "productTable", "productMessage",
    "addStoreBtn", "newStoreName", "addProductBtn", "productName", "productPriceM", "productPriceL"
  ].map(id => [id, document.getElementById(id)]));
  let latestSummaryText = "";
  let orderRequest = 0;
  let storeRequest = 0;
  let productRequest = 0;

  function emptyRow(columns, text) {
    return `<tr><td colspan="${columns}">${html(text)}</td></tr>`;
  }

  function logo(url, className) {
    return url ? `<img src="${html(url)}" class="${className}" alt="">` : "";
  }

  async function requireLogin() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) return true;
    window.location.replace("login.html");
    return false;
  }

  function totals(orders) {
    return orders.reduce((sum, order) => ({
      cups: sum.cups + Number(order.quantity),
      amount: sum.amount + Number(order.total_price)
    }), { cups: 0, amount: 0 });
  }

  function specs(order, separator = " / ") {
    return [order.sugar, order.ice, order.topping_name ? "+" + order.topping_name : ""]
      .filter(Boolean).join(separator);
  }

  function renderOrders(orders) {
    el.tbody.innerHTML = orders.length ? orders.map(order => {
      const date = new Date(order.created_at);
      return `<tr>
        <td class="order-time"><div class="order-date">${html(date.toLocaleDateString("zh-TW"))}</div>
          <div class="order-note">${html(date.toLocaleTimeString("zh-TW", {
            hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true
          }))}</div></td>
        <td>${html(order.customer_name)}</td>
        <td><div class="order-store">${logo(order.store_logo, "order-store-logo")}
          <span>${html(order.store_name)}</span></div></td>
        <td class="order-product">${html(order.product_name)}
          ${order.note ? `<div class="order-note">備註：${html(order.note)}</div>` : ""}</td>
        <td class="order-spec">${html(specs(order) || "-")}</td>
        <td class="order-qty">${html(order.quantity)}</td>
        <td class="order-price">$${html(order.total_price)}</td>
        <td><button type="button" class="delete-order-btn" data-id="${html(order.id)}"
          title="刪除訂單" aria-label="刪除訂單">✕</button></td>
      </tr>`;
    }).join("") : emptyRow(8, "目前沒有訂單");

    const total = totals(orders);
    el.overview.innerHTML = `<span class="badge">訂單 ${orders.length} 筆</span>
      <span class="badge">共 ${total.cups} 杯</span>
      <span class="badge">總金額 $${total.amount}</span>`;
    renderSummary(orders, total);
  }

  function renderSummary(orders, total) {
    if (!orders.length) {
      latestSummaryText = "目前沒有訂單";
      el.summary.textContent = latestSummaryText;
      return;
    }
    // Map 可安全處理 "__proto__"、"constructor" 等品名。
    const stores = new Map();
    for (const order of orders) {
      const key = String(order.store_id ?? "unknown");
      if (!stores.has(key)) stores.set(key, {
        name: order.store_name, logo: order.store_logo, orders: [], products: new Map()
      });
      const store = stores.get(key);
      store.orders.push(order);
      if (!store.products.has(order.product_name)) store.products.set(order.product_name, new Map());
      const details = store.products.get(order.product_name);
      const detail = [specs(order, " "), order.note ? `備註：${order.note}` : ""].filter(Boolean).join("；");
      details.set(detail, (details.get(detail) || 0) + Number(order.quantity));
    }
    const text = [];
    const blocks = [];
    for (const store of stores.values()) {
      text.push(`【${store.name}】`);
      const products = [];
      for (const [name, details] of store.products) {
        const cups = [...details.values()].reduce((sum, value) => sum + value, 0);
        text.push(`${name} × ${cups}`);
        const lines = [];
        for (const [detail, count] of details) {
          text.push(`- ${detail || "-"} × ${count}`);
          lines.push(`<div class="summary-detail">${html(detail || "-")} × ${count}</div>`);
        }
        products.push(`<div class="summary-product"><strong>${html(name)} × ${cups}</strong>${lines.join("")}</div>`);
      }
      const subtotal = totals(store.orders);
      text.push(`店家杯數：${subtotal.cups}`, `店家金額：$${subtotal.amount}`, "");
      blocks.push(`<div class="store-summary">
        <div class="store-summary-header">${logo(store.logo, "store-summary-logo")}<span>${html(store.name)}</span></div>
        ${products.join("")}
        <div class="store-summary-total"><div>店家杯數：<strong>${subtotal.cups}</strong></div>
        <div>店家金額：<strong>$${subtotal.amount}</strong></div></div></div>`);
    }
    text.push(`全部總杯數：${total.cups}`, `全部總金額：$${total.amount}`);
    blocks.push(`<div class="all-summary-total"><div>全部總杯數：<strong>${total.cups}</strong></div>
      <div>全部總金額：<strong>$${total.amount}</strong></div></div>`);
    latestSummaryText = text.join("\n");
    el.summary.innerHTML = blocks.join("");
  }

  async function loadOrders() {
    const request = ++orderRequest;
    latestSummaryText = "";
    el.copyBtn.disabled = true;
    el.overview.textContent = "載入中...";
    el.summary.textContent = "載入中...";
    el.tbody.innerHTML = emptyRow(8, "載入中...");
    try {
      if (!await requireLogin()) return;
      const [orders, stores] = await Promise.all([
        readAll(() => client.from("orders").select("*").order("created_at", { ascending: false }).order("id")),
        readAll(() => client.from("stores").select("*").order("id"))
      ]);
      if (request !== orderRequest) return;
      const storeMap = new Map(stores.map(store => [String(store.id), store]));
      renderOrders(orders.map(order => {
        const store = storeMap.get(String(order.store_id));
        return { ...order, store_name: store?.name || "未知店家", store_logo: store?.logo_url || "" };
      }));
      el.copyBtn.disabled = false;
    } catch (error) {
      if (request !== orderRequest) return;
      el.overview.textContent = "讀取失敗";
      el.summary.textContent = "讀取訂單失敗：" + error.message;
      el.tbody.innerHTML = emptyRow(8, "讀取失敗，請重新整理");
    }
  }

  // RLS 拒絕更新／刪除時可能只回傳零筆，而不是 error。
  async function mutateOne(query) {
    const { data, error } = await query.select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("沒有變更任何資料，請確認權限或重新整理");
  }

  function actionButtons(item) {
    return `<div class="management-actions">
      <button type="button" data-action="toggle" data-id="${html(item.id)}" data-active="${item.active}">
        ${item.active ? "停用" : "啟用"}</button>
      <button type="button" class="danger" data-action="delete" data-id="${html(item.id)}" data-name="${html(item.name)}">
        刪除</button></div>`;
  }

  async function loadStores() {
    const request = ++storeRequest;
    const previous = el.manageStore.value;
    // 立即清空舊品項，避免在店家重載期間操作過期資料。
    ++productRequest;
    el.manageStore.disabled = true;
    el.manageStore.replaceChildren(new Option("載入中...", ""));
    el.storeTable.innerHTML = emptyRow(3, "載入中...");
    el.productTable.innerHTML = emptyRow(5, "載入中...");
    try {
      const stores = await readAll(() => client.from("stores").select("*").order("id"));
      if (request !== storeRequest) return;
      el.storeTable.innerHTML = stores.length ? stores.map(store => `<tr>
        <td>${html(store.name)}</td><td>${store.active ? "啟用" : "停用"}</td>
        <td>${actionButtons(store)}</td></tr>`).join("") : emptyRow(3, "目前沒有店家");
      const active = stores.filter(store => store.active);
      el.manageStore.replaceChildren(...active.map(store => new Option(store.name, String(store.id))));
      if (active.some(store => String(store.id) === previous)) el.manageStore.value = previous;
      await loadProducts();
    } catch (error) {
      if (request !== storeRequest) return;
      el.storeTable.innerHTML = emptyRow(3, "讀取失敗");
      el.productTable.innerHTML = emptyRow(5, "請重新整理店家資料");
      showMessage(el.storeMessage, "讀取店家失敗：" + error.message, "err");
    } finally {
      if (request === storeRequest) el.manageStore.disabled = false;
    }
  }

  async function loadProducts() {
    const request = ++productRequest;
    const storeId = el.manageStore.value;
    if (!storeId) {
      el.productTable.innerHTML = emptyRow(5, "目前沒有可管理的啟用店家");
      return;
    }
    el.productTable.innerHTML = emptyRow(5, "載入中...");
    try {
      const products = await readAll(() => client.from("products").select("*").eq("store_id", storeId).order("id"));
      if (request !== productRequest) return;
      el.productTable.innerHTML = products.length ? products.map(product => {
        const sizes = productSizes(product);
        const medium = sizes.find(item => item.size === "M");
        const large = sizes.find(item => item.size === "L");
        const legacy = sizes.find(item => item.size === "單一價");
        return `<tr><td>${html(product.name)}</td>
          <td>${medium ? "$" + medium.price : "-"}</td>
          <td>${large ? "$" + large.price : legacy ? "$" + legacy.price + "（單一價）" : "-"}</td>
          <td>${product.active ? "啟用" : "停用"}</td><td>${actionButtons(product)}</td></tr>`;
      }).join("") : emptyRow(5, "目前沒有飲料");
    } catch (error) {
      if (request !== productRequest) return;
      el.productTable.innerHTML = emptyRow(5, "讀取失敗");
      showMessage(el.productMessage, "讀取飲料失敗：" + error.message, "err");
    }
  }

  function bindActions(table, tableName, reload) {
    table.addEventListener("click", event => {
      const button = event.target.closest("button[data-action]");
      if (!button || !table.contains(button)) return;
      withButton(button, async () => {
        if (!await requireLogin()) return;
        const { id, action, name, active } = button.dataset;
        if (action === "toggle") {
          await mutateOne(client.from(tableName).update({ active: active !== "true" }).eq("id", id));
        } else if (action === "delete") {
          const extra = tableName === "stores" ? "\n該店家的飲料與加料會一起刪除。" : "";
          if (!confirm(`確定要刪除「${name}」嗎？${extra}`)) return;
          if (!confirm(`再次確認：永久刪除「${name}」？此操作無法復原。`)) return;
          // 由資料庫外鍵 cascade 原子性刪除，避免先刪品項後店家刪除失敗。
          await mutateOne(client.from(tableName).delete().eq("id", id));
        }
        await reload();
      }, error => alert("操作失敗：" + error.message));
    });
  }

  bindActions(el.storeTable, "stores", async () => { await loadStores(); await loadOrders(); });
  bindActions(el.productTable, "products", loadProducts);
  el.manageStore.addEventListener("change", loadProducts);

  el.addStoreBtn.addEventListener("click", () => withButton(el.addStoreBtn, async () => {
    const name = el.newStoreName.value.trim();
    if (!name) throw new Error("請輸入店家名稱");
    const { error } = await client.from("stores").insert({ name, active: true });
    if (error) throw error;
    el.newStoreName.value = "";
    showMessage(el.storeMessage, "店家新增成功");
    await loadStores();
  }, error => showMessage(el.storeMessage, error.message, "err")));

  el.addProductBtn.addEventListener("click", () => withButton(el.addProductBtn, async () => {
    const storeId = el.manageStore.value;
    const name = el.productName.value.trim();
    const parsePrice = input => input.value.trim() === "" ? null : Number(input.value);
    const priceM = parsePrice(el.productPriceM);
    const priceL = parsePrice(el.productPriceL);
    if (!storeId) throw new Error("請先建立或選擇店家");
    if (!name) throw new Error("請輸入飲料名稱");
    if (priceM === null && priceL === null) throw new Error("M / L 至少輸入一個價格");
    if ([priceM, priceL].some(price => price !== null && (!Number.isSafeInteger(price) || price < 0))) {
      throw new Error("價格請輸入零或正整數");
    }
    const { error } = await client.from("products").insert({
      store_id: storeId, name, price: priceL ?? priceM, price_m: priceM, price_l: priceL, active: true
    });
    if (error) throw error;
    el.productName.value = "";
    el.productPriceM.value = "";
    el.productPriceL.value = "";
    showMessage(el.productMessage, "飲料新增成功");
    await loadProducts();
  }, error => showMessage(el.productMessage, error.message, "err")));

  el.tbody.addEventListener("click", event => {
    const button = event.target.closest(".delete-order-btn");
    if (!button || !el.tbody.contains(button)) return;
    withButton(button, async () => {
      if (!confirm("確定要刪除這筆訂單嗎？")) return;
      await mutateOne(client.from("orders").delete().eq("id", button.dataset.id));
      await loadOrders();
    }, error => alert("刪除失敗：" + error.message));
  });

  el.deleteAllBtn.addEventListener("click", () => withButton(el.deleteAllBtn, async () => {
    if (!confirm("確定要刪除全部訂單嗎？此操作無法復原！")) return;
    if (!confirm("再次確認：真的要清空所有訂單紀錄嗎？")) return;
    const { count, error } = await client.from("orders").delete({ count: "exact" }).not("id", "is", null);
    if (error) throw error;
    await loadOrders();
    alert(count > 0 ? `已刪除 ${count} 筆訂單` : "沒有刪除任何訂單，可能已清空或沒有刪除權限");
  }, error => alert("刪除失敗：" + error.message)));

  el.refreshBtn.addEventListener("click", () => withButton(el.refreshBtn,
    async () => { if (await requireLogin()) await Promise.all([loadOrders(), loadStores()]); },
    error => alert("重新整理失敗：" + error.message)));
  el.copyBtn.addEventListener("click", () => withButton(el.copyBtn, async () => {
    if (!latestSummaryText) throw new Error("請先載入訂單");
    await navigator.clipboard.writeText(latestSummaryText);
    alert("已複製店家訂單");
  }, () => alert("複製失敗，請手動複製")));
  el.logoutBtn.addEventListener("click", () => withButton(el.logoutBtn, async () => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    window.location.replace("login.html");
  }, error => alert("登出失敗：" + error.message)));

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) window.location.replace("login.html");
  });
  async function init() {
    try {
      if (await requireLogin()) await Promise.all([loadOrders(), loadStores()]);
    } catch (error) {
      el.overview.textContent = "登入狀態檢查失敗：" + error.message;
    }
  }
  init();
})();
