const supabaseClient = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const storeEl = document.getElementById("store");
const productEl = document.getElementById("product");
const sizeEl = document.getElementById("size");
const toppingEl = document.getElementById("topping");
const qtyEl = document.getElementById("quantity");
const totalEl = document.getElementById("total");
const msgEl = document.getElementById("message");

let stores = [];
let products = [];
let toppings = [];

function showMessage(text, type = "ok") {
  msgEl.className = `message ${type}`;
  msgEl.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getProductPriceText(product) {
  const hasM =
    product.price_m !== null &&
    product.price_m !== undefined;

  const hasL =
    product.price_l !== null &&
    product.price_l !== undefined;

  if (hasM && hasL) {
    return `M $${product.price_m} / L $${product.price_l}`;
  }

  if (hasM) {
    return `M $${product.price_m}`;
  }

  if (hasL) {
    return `L $${product.price_l}`;
  }

  // 相容舊資料
  if (
    product.price !== null &&
    product.price !== undefined
  ) {
    return `$${product.price}`;
  }

  return "價格未設定";
}

function updateSizeOptions() {
  const product = products.find(
    p => String(p.id) === String(productEl.value)
  );

  if (!product) {
    sizeEl.innerHTML = `
      <option value="" data-price="0">
        無可選尺寸
      </option>
    `;

    updateTotal();
    return;
  }

  const options = [];

  if (
    product.price_m !== null &&
    product.price_m !== undefined
  ) {
    options.push(`
      <option
        value="M"
        data-price="${Number(product.price_m)}"
      >
        M $${Number(product.price_m)}
      </option>
    `);
  }

  if (
    product.price_l !== null &&
    product.price_l !== undefined
  ) {
    options.push(`
      <option
        value="L"
        data-price="${Number(product.price_l)}"
      >
        L $${Number(product.price_l)}
      </option>
    `);
  }

  // 相容你舊的 price 欄位
  if (
    options.length === 0 &&
    product.price !== null &&
    product.price !== undefined
  ) {
    options.push(`
      <option
        value="單一價"
        data-price="${Number(product.price)}"
      >
        $${Number(product.price)}
      </option>
    `);
  }

  if (options.length === 0) {
    options.push(`
      <option value="" data-price="0">
        價格未設定
      </option>
    `);
  }

  sizeEl.innerHTML = options.join("");

  updateTotal();
}

async function loadStores() {
  const { data, error } = await supabaseClient
    .from("stores")
    .select("id,name,active,sort_order")
    .eq("active", true)
    .order("sort_order", {
      ascending: true
    })
    .order("name", {
      ascending: true
    });

  if (error) {
    return showMessage(
      "讀取店家失敗：" + error.message,
      "err"
    );
  }

  stores = data || [];

  if (stores.length === 0) {
    storeEl.innerHTML =
      `<option value="">目前沒有店家</option>`;

    productEl.innerHTML =
      `<option value="">目前沒有飲料</option>`;

    sizeEl.innerHTML =
      `<option value="">--</option>`;

    totalEl.textContent = "$0";

    return;
  }



  storeEl.innerHTML =
    `<option value="">請選擇店家</option>` +
    stores
      .map(store => {
        return `
        <option value="${store.id}">
          ${escapeHtml(store.name)}
        </option>
      `;
      })
      .join("");

  productEl.innerHTML =
    `<option value="">請先選擇店家</option>`;

  sizeEl.innerHTML =
    `<option value="" data-price="0">請先選擇飲料</option>`;

  toppingEl.innerHTML =
    `<option value="" data-price="0">不加料</option>`;

  totalEl.textContent = "$0";


}

async function loadProducts(storeId) {
  const { data, error } = await supabaseClient
    .from("products")
    .select(`
      id,
      store_id,
      category_id,
      name,
      price,
      price_m,
      price_l,
      active,
      sort_order
    `)
    .eq("store_id", storeId)
    .eq("active", true)
    .order("sort_order", {
      ascending: true
    })
    .order("name", {
      ascending: true
    });

  if (error) {
    productEl.innerHTML =
      `<option value="">讀取失敗</option>`;

    sizeEl.innerHTML =
      `<option value="">--</option>`;

    return showMessage(
      "讀取飲料失敗：" + error.message,
      "err"
    );
  }

  products = data || [];

  if (products.length === 0) {
    productEl.innerHTML =
      `<option value="">目前沒有飲料</option>`;

    sizeEl.innerHTML =
      `<option value="">--</option>`;

    updateTotal();

    return;
  }

  productEl.innerHTML =
    `<option value="">請選擇飲料</option>` +
    products
      .map(product => {
        return `
        <option value="${product.id}">
          ${escapeHtml(product.name)}
          ｜${getProductPriceText(product)}
        </option>
      `;
      })
      .join("");

  sizeEl.innerHTML =
    `<option value="" data-price="0">請先選擇飲料</option>`;

  updateTotal();
}

async function loadToppings(storeId) {
  const { data, error } = await supabaseClient
    .from("toppings")
    .select("*")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("name");

  // 如果 toppings 還沒建立，
  // 也不影響訂飲料
  if (error) {
    console.warn(
      "讀取加料失敗：",
      error.message
    );

    toppings = [];

    toppingEl.innerHTML = `
      <option
        value=""
        data-price="0"
      >
        不加料
      </option>
    `;

    updateTotal();

    return;
  }

  toppings = data || [];

  toppingEl.innerHTML =
    `
      <option
        value=""
        data-price="0"
      >
        不加料
      </option>
    ` +
    toppings
      .map(topping => {
        return `
          <option
            value="${topping.id}"
            data-price="${topping.price}"
          >
            ${escapeHtml(topping.name)}
            +$${topping.price}
          </option>
        `;
      })
      .join("");

  updateTotal();
}

function updateTotal() {
  const sizeOption =
    sizeEl.options[sizeEl.selectedIndex];

  const toppingOption =
    toppingEl.options[
    toppingEl.selectedIndex
    ];

  const productPrice =
    Number(
      sizeOption?.dataset.price || 0
    );

  const toppingPrice =
    Number(
      toppingOption?.dataset.price || 0
    );

  const quantity =
    Math.max(
      1,
      Number(qtyEl.value || 1)
    );

  const total =
    (
      productPrice +
      toppingPrice
    ) * quantity;

  totalEl.textContent =
    `$${total}`;
}



storeEl.addEventListener(
  "change",
  async () => {

    if (!storeEl.value) {

      productEl.innerHTML =
        `<option value="">請先選擇店家</option>`;

      sizeEl.innerHTML =
        `<option value="" data-price="0">請先選擇飲料</option>`;

      toppingEl.innerHTML =
        `<option value="" data-price="0">不加料</option>`;

      totalEl.textContent = "$0";

      return;
    }

    await loadProducts(
      storeEl.value
    );

    await loadToppings(
      storeEl.value
    );

  }
);


productEl.addEventListener(
  "change",
  updateSizeOptions
);

sizeEl.addEventListener(
  "change",
  updateTotal
);

toppingEl.addEventListener(
  "change",
  updateTotal
);

qtyEl.addEventListener(
  "input",
  updateTotal
);

document
  .getElementById("submitBtn")
  .addEventListener(
    "click",
    async () => {

      const submitBtn =
        document.getElementById(
          "submitBtn"
        );

      const name =
        document
          .getElementById("name")
          .value
          .trim();

      const note =
        document
          .getElementById("note")
          .value
          .trim();

      const sugar =
        document
          .getElementById("sugar")
          .value;

      const ice =
        document
          .getElementById("ice")
          .value;

      const quantity =
        Math.max(
          1,
          Number(qtyEl.value || 1)
        );

      // =========================
      // 基本檢查
      // =========================

      if (!name) {
        return showMessage(
          "請輸入訂購人姓名",
          "err"
        );
      }

      // =========================
      // 基本檢查
      // =========================

      if (!name) {
        return showMessage(
          "請輸入訂購人姓名",
          "err"
        );
      }

      // 沒選店家
      if (!storeEl.value) {
        return showMessage(
          "請選擇店家",
          "err"
        );
      }

      // 沒選飲料
      if (!productEl.value) {
        return showMessage(
          "請選擇飲料",
          "err"
        );
      }

      // 沒選尺寸
      if (!sizeEl.value) {
        return showMessage(
          "請選擇尺寸",
          "err"
        );
      }

      // 沒選甜度
      if (!sugar) {
        return showMessage(
          "請選擇甜度",
          "err"
        );
      }

      // 沒選冰塊
      if (!ice) {
        return showMessage(
          "請選擇冰塊",
          "err"
        );
      }

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(productEl.value)
        );

      const topping =
        toppings.find(
          t =>
            String(t.id) ===
            String(toppingEl.value)
        );

      if (!product) {
        return showMessage(
          "找不到飲料資料，請重新整理頁面",
          "err"
        );
      }

      const sizeOption =
        sizeEl.options[
        sizeEl.selectedIndex
        ];

      const size =
        sizeOption?.value || "";

      const drinkPrice =
        Number(
          sizeOption?.dataset.price || 0
        );

      if (drinkPrice <= 0) {
        return showMessage(
          "此飲料尚未設定價格",
          "err"
        );
      }

      const toppingPrice =
        topping
          ? Number(topping.price)
          : 0;

      const unitPrice =
        drinkPrice +
        toppingPrice;

      const totalPrice =
        unitPrice *
        quantity;

      // 因為你目前 orders
      // 沒有獨立 size 欄位
      // 所以先把尺寸寫進飲料名稱
      const orderProductName =
        size &&
          size !== "單一價"
          ? `${product.name} (${size})`
          : product.name;

      const payload = {

        customer_name:
          name,

        store_id:
          Number(storeEl.value),

        product_id:
          Number(productEl.value),

        product_name:
          orderProductName,

        sugar:
          sugar,

        ice:
          ice,

        topping_name:
          topping
            ? topping.name
            : null,

        quantity:
          quantity,

        unit_price:
          unitPrice,

        total_price:
          totalPrice,

        note:
          note

      };

      // =========================
      // 送出中
      // =========================

      submitBtn.disabled = true;

      submitBtn.textContent =
        "送出中...";

      msgEl.className =
        "message";

      msgEl.textContent =
        "";

      try {

        const { error } =
          await supabaseClient
            .from("orders")
            .insert(payload);

        if (error) {
          throw error;
        }

        submitBtn.textContent =
          "✅ 訂購成功";

        showMessage(
          `訂購成功！${orderProductName} × ${quantity}，共 $${totalPrice}`,
          "ok"
        );

        // =========================
        // 0.5 秒後清空
        // =========================

        setTimeout(
          () => {

            document
              .getElementById(
                "name"
              )
              .value = "";

            document
              .getElementById(
                "note"
              )
              .value = "";

            qtyEl.value = 1;

            if (
              productEl
                .options
                .length > 0
            ) {

              productEl
                .selectedIndex = 0;

            }

            updateSizeOptions();

            document
              .getElementById(
                "sugar"
              )
              .selectedIndex = 0;

            document
              .getElementById(
                "ice"
              )
              .selectedIndex = 0;

            if (
              toppingEl
                .options
                .length > 0
            ) {

              toppingEl
                .selectedIndex = 0;

            }

            updateTotal();

            submitBtn.disabled =
              false;

            submitBtn.textContent =
              "送出訂單";

            document
              .getElementById(
                "name"
              )
              .focus();

          },
          500
        );

      } catch (error) {

        console.error(
          "送出訂單失敗：",
          error
        );

        showMessage(
          "送出失敗：" +
          error.message,
          "err"
        );

        submitBtn.disabled =
          false;

        submitBtn.textContent =
          "送出訂單";

      }

    }
  );

loadStores();