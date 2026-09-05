(() => {
  const { client, escapeHtml, showMessage, productSizes, quantity, menuSort, readAll, withButton } = DrinkApp;
  const el = Object.fromEntries([
    "store", "storeLogo", "storeLogoPlaceholder", "product", "size", "topping",
    "quantity", "quantityMinus", "quantityPlus", "total", "message", "name", "note",
    "sugar", "ice", "submitBtn", "successModal", "successModalText", "successModalBtn", "successStoreLogo"
  ].map(id => [id, document.getElementById(id)]));
  let stores = [];
  let products = [];
  let toppings = [];
  let menuRequest = 0;
  let menuLoading = false;

  function placeholder(select, text) {
    select.replaceChildren(new Option(text, ""));
  }

  function selectedProduct() {
    return products.find(product => String(product.id) === el.product.value);
  }

  function selectedSize() {
    return productSizes(selectedProduct()).find(item => item.size === el.size.value);
  }

  function selectedTopping() {
    return toppings.find(topping => String(topping.id) === el.topping.value);
  }

  function updateTotal() {
    const price = selectedSize()?.price ?? 0;
    const extra = Number(selectedTopping()?.price ?? 0);
    el.total.textContent = `$${(price + extra) * quantity(el.quantity.value)}`;
  }

  function updateSizeOptions() {
    const sizes = productSizes(selectedProduct());
    el.size.replaceChildren(...sizes.map(item =>
      new Option(`${item.size} $${item.price}`, item.size)));
    if (!sizes.length) placeholder(el.size, "請先選擇飲料");
    updateTotal();
  }

  function updateStoreLogo() {
    const store = stores.find(item => String(item.id) === el.store.value);
    const hasLogo = Boolean(store?.logo_url);
    if (hasLogo) {
      el.storeLogo.src = store.logo_url;
      el.storeLogo.alt = `${store.name} Logo`;
    } else {
      el.storeLogo.removeAttribute("src");
    }
    el.storeLogo.style.display = hasLogo ? "block" : "none";
    el.storeLogoPlaceholder.style.display = hasLogo ? "none" : "block";
  }

  async function loadMenu() {
    const request = ++menuRequest;
    const storeId = el.store.value;
    products = [];
    toppings = [];
    menuLoading = Boolean(storeId);
    placeholder(el.product, storeId ? "載入中..." : "請先選擇店家");
    placeholder(el.size, "請先選擇飲料");
    placeholder(el.topping, "不加料");
    el.product.disabled = menuLoading;
    el.topping.disabled = menuLoading;
    showMessage(el.message, "");
    updateStoreLogo();
    updateTotal();
    if (!storeId) return;

    try {
      const [productResult, toppingResult] = await Promise.allSettled([
        readAll(() => client.from("products").select("*")
          .eq("store_id", storeId).eq("active", true).order("id")),
        readAll(() => client.from("toppings").select("*")
          .eq("store_id", storeId).eq("active", true).order("id"))
      ]);
      // 快速切換店家時，忽略已過期的回應。
      if (request !== menuRequest) return;
      if (productResult.status === "rejected") throw productResult.reason;
      products = productResult.value.sort(menuSort);
      placeholder(el.product, products.length ? "請選擇飲料" : "目前沒有飲料");
      for (const product of products) {
        const prices = productSizes(product).map(item =>
          `${item.size} $${item.price}`).join(" / ") || "價格未設定";
        el.product.add(new Option(`${product.name}｜${prices}`, String(product.id)));
      }
      if (toppingResult.status === "fulfilled") {
        toppings = toppingResult.value.sort((a, b) => String(a.name).localeCompare(String(b.name), "zh-TW"));
        for (const topping of toppings) {
          el.topping.add(new Option(`${topping.name} +$${topping.price}`, String(topping.id)));
        }
      } else {
        showMessage(el.message, "加料讀取失敗，目前僅能選擇不加料。", "err");
      }
    } catch (error) {
      if (request !== menuRequest) return;
      placeholder(el.product, "讀取失敗，請重新選擇店家");
      showMessage(el.message, "讀取飲料失敗：" + error.message, "err");
    } finally {
      if (request === menuRequest) {
        menuLoading = false;
        el.product.disabled = false;
        el.topping.disabled = false;
        updateTotal();
      }
    }
  }

  async function submitOrder() {
    if (menuLoading) throw new Error("菜單載入中，請稍候");
    const name = el.name.value.trim();
    if (!name) throw new Error("請輸入訂購人姓名");
    const store = stores.find(item => String(item.id) === el.store.value);
    if (!store) throw new Error("請選擇店家");
    const product = selectedProduct();
    if (!product || String(product.store_id) !== el.store.value) throw new Error("請選擇飲料");
    const size = selectedSize();
    if (!size) throw new Error("請選擇尺寸");
    if (!el.sugar.value) throw new Error("請選擇甜度");
    if (!el.ice.value) throw new Error("請選擇冰塊");
    const topping = selectedTopping();
    if (el.topping.value && (!topping || String(topping.store_id) !== el.store.value)) {
      throw new Error("加料資料已變更，請重新選擇");
    }
    const cups = quantity(el.quantity.value);
    el.quantity.value = cups;
    const unitPrice = size.price + Number(topping?.price ?? 0);
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) throw new Error("價格設定有誤");
    const productName = size.size === "單一價" ? product.name : `${product.name} (${size.size})`;
    const payload = {
      customer_name: name, store_id: store.id, product_id: product.id,
      product_name: productName, sugar: el.sugar.value, ice: el.ice.value,
      topping_name: topping?.name ?? null, quantity: cups,
      unit_price: unitPrice, total_price: unitPrice * cups, note: el.note.value.trim()
    };
    el.submitBtn.textContent = "送出中...";
    showMessage(el.message, "");
    // 防止送出途中修改表單，導致成功畫面與實際訂單不一致。
    const controls = [el.store, el.product, el.size, el.topping, el.quantity,
      el.quantityMinus, el.quantityPlus, el.name, el.note, el.sugar, el.ice];
    const disabledStates = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    try {
      const { error } = await client.from("orders").insert(payload);
      if (error) throw error;
      showMessage(el.message, `訂購成功！${productName} × ${cups}，共 $${payload.total_price}`);
      if (store.logo_url) el.successStoreLogo.src = store.logo_url;
      else el.successStoreLogo.removeAttribute("src");
      el.successStoreLogo.alt = `${store.name} Logo`;
      el.successStoreLogo.style.display = store.logo_url ? "block" : "none";
      el.successModalText.innerHTML = [
        ["店家", store.name], ["飲料", productName], ["數量", cups], ["總金額", `$${payload.total_price}`]
      ].map(([label, value]) => `<p>${label}：<strong>${escapeHtml(value)}</strong></p>`).join("");
      el.name.value = "";
      el.note.value = "";
      el.quantity.value = 1;
      el.product.selectedIndex = 0;
      el.sugar.selectedIndex = 0;
      el.ice.selectedIndex = 0;
      el.topping.selectedIndex = 0;
      updateSizeOptions();
      el.successModal.classList.add("show");
      el.successModalBtn.focus();
    } finally {
      controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
      el.submitBtn.textContent = "送出訂單";
    }
  }

  el.store.addEventListener("change", loadMenu);
  el.product.addEventListener("change", updateSizeOptions);
  el.size.addEventListener("change", updateTotal);
  el.topping.addEventListener("change", updateTotal);
  el.quantity.addEventListener("input", updateTotal);
  el.quantity.addEventListener("change", () => {
    el.quantity.value = quantity(el.quantity.value);
    updateTotal();
  });
  for (const [button, step] of [[el.quantityMinus, -1], [el.quantityPlus, 1]]) {
    button.addEventListener("click", () => {
      el.quantity.value = quantity(quantity(el.quantity.value) + step);
      updateTotal();
    });
  }
  el.submitBtn.addEventListener("click", () =>
    withButton(el.submitBtn, submitOrder, error => showMessage(el.message, error.message, "err")));
  el.successModalBtn.addEventListener("click", () => {
    el.successModal.classList.remove("show");
    el.name.focus();
  });

  async function init() {
    placeholder(el.product, "請先選擇店家");
    placeholder(el.size, "請先選擇飲料");
    el.store.disabled = true;
    try {
      stores = (await readAll(() => client.from("stores").select("*")
        .eq("active", true).order("id"))).sort(menuSort);
      placeholder(el.store, stores.length ? "請選擇店家" : "目前沒有店家");
      for (const store of stores) el.store.add(new Option(store.name, String(store.id)));
    } catch (error) {
      showMessage(el.message, "讀取店家失敗：" + error.message, "err");
    } finally {
      el.store.disabled = false;
    }
  }
  init();
})();
