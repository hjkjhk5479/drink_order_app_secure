const supabaseClient = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const tbody = document.getElementById("tbody");
const overview = document.getElementById("overview");
const summaryEl = document.getElementById("summary");

let latestSummaryText = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function requireLogin() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace("login.html");
    return false;
  }

  return true;
}

async function loadOrders() {
  const loggedIn = await requireLogin();

  if (!loggedIn) return;

  overview.textContent = "載入中...";
  summaryEl.textContent = "載入中...";

  // 讀取訂單
  const {
    data: orderData,
    error: orderError
  } = await supabaseClient
    .from("orders")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (orderError) {
    console.error(orderError);

    overview.textContent = "讀取失敗";
    summaryEl.textContent =
      "讀取訂單失敗：" +
      orderError.message;

    return;
  }

  // 讀取店家資料
  const {
    data: storeData,
    error: storeError
  } = await supabaseClient
    .from("stores")
    .select("id,name,logo_url");

  if (storeError) {
    console.error(storeError);
  }

  const stores = storeData || [];

  // 把店家名稱與 Logo 加進訂單
  const orders = (orderData || []).map(
    order => {

      const store = stores.find(
        s =>
          String(s.id) ===
          String(order.store_id)
      );

      return {
        ...order,

        store_name:
          store?.name || "未知店家",

        store_logo:
          store?.logo_url || ""
      };
    }
  );

  renderTable(orders);
  renderOverview(orders);
  renderSummary(orders);
}

function renderTable(orders) {

  if (orders.length === 0) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          目前沒有訂單
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    orders.map(order => {

      const time =
        new Date(
          order.created_at
        ).toLocaleString(
          "zh-TW"
        );


      // =========================
      // 規格
      // =========================

      const specs = [
        order.sugar,
        order.ice,

        order.topping_name
          ? "+" + order.topping_name
          : null
      ]
        .filter(Boolean)
        .join(" / ");


      return `

        <tr>

          <td class="order-time">
            ${time}
          </td>


          <td>
            ${escapeHtml(
              order.customer_name
            )}
          </td>


          <td>

            <div class="order-store">

              ${
                order.store_logo
                  ? `
                    <img
                      src="${escapeHtml(
                        order.store_logo
                      )}"
                      class="order-store-logo"
                      alt=""
                    >
                  `
                  : ""
              }

              <span>
                ${escapeHtml(
                  order.store_name
                )}
              </span>

            </div>

          </td>


          <td class="order-product">

            <div>
              ${escapeHtml(
                order.product_name
              )}
            </div>

            ${
              order.note
                ? `
                  <div class="order-note">
                    備註：
                    ${escapeHtml(
                      order.note
                    )}
                  </div>
                `
                : ""
            }

          </td>


          <td class="order-spec">

            ${escapeHtml(
              specs || "-"
            )}

          </td>


          <td class="order-qty">

            ${order.quantity}

          </td>


          <td class="order-price">

            $${order.total_price}

          </td>

        </tr>

      `;

    }).join("");
}

function renderOverview(orders) {
  const totalOrders = orders.length;

  const totalCups = orders.reduce(
    (sum, order) => {
      return sum + Number(order.quantity);
    },
    0
  );

  const totalAmount = orders.reduce(
    (sum, order) => {
      return sum + Number(order.total_price);
    },
    0
  );

  overview.innerHTML = `
    <span class="badge">
      訂單 ${totalOrders} 筆
    </span>

    <span class="badge">
      共 ${totalCups} 杯
    </span>

    <span class="badge">
      總金額 $${totalAmount}
    </span>
  `;
}

function renderSummary(orders) {

  if (orders.length === 0) {
    latestSummaryText =
      "目前沒有訂單";

    summaryEl.textContent =
      latestSummaryText;

    return;
  }


  // =========================
  // 依照店家分組
  // =========================

  const storeGroups = {};

  orders.forEach(order => {

    const storeKey =
      String(order.store_id || "unknown");

    if (!storeGroups[storeKey]) {

      storeGroups[storeKey] = {

        storeName:
          order.store_name ||
          "未知店家",

        storeLogo:
          order.store_logo || "",

        orders: []
      };

    }

    storeGroups[storeKey]
      .orders
      .push(order);

  });


  // =========================
  // 網頁顯示
  // =========================

  const htmlParts = [];

  // =========================
  // 複製文字
  // =========================

  const textParts = [];


  Object.values(
    storeGroups
  ).forEach(group => {

    const groupedProducts = {};

    let storeCups = 0;
    let storeAmount = 0;


    group.orders.forEach(order => {

      const productName =
        order.product_name;

      const detail = [
        order.sugar,
        order.ice,

        order.topping_name
          ? "+" + order.topping_name
          : ""
      ]
        .filter(Boolean)
        .join(" ");


      if (
        !groupedProducts[
          productName
        ]
      ) {

        groupedProducts[
          productName
        ] = {};

      }


      if (
        !groupedProducts[
          productName
        ][detail]
      ) {

        groupedProducts[
          productName
        ][detail] = 0;

      }


      groupedProducts[
        productName
      ][detail] +=
        Number(order.quantity);


      storeCups +=
        Number(order.quantity);

      storeAmount +=
        Number(order.total_price);

    });


    // =========================
    // 店家 HTML 標題
    // =========================

    htmlParts.push(`

      <div class="store-summary">

        <div class="store-summary-header">

          ${
            group.storeLogo
              ? `
                <img
                  src="${escapeHtml(
                    group.storeLogo
                  )}"
                  class="store-summary-logo"
                  alt=""
                >
              `
              : ""
          }

          <span>
            ${escapeHtml(
              group.storeName
            )}
          </span>

        </div>

    `);


    // 複製文字店家標題
    textParts.push(
      `【${group.storeName}】`
    );


    // =========================
    // 飲料分類
    // =========================

    Object.entries(
      groupedProducts
    ).forEach(
      ([productName, details]) => {

        const productTotal =
          Object
            .values(details)
            .reduce(
              (sum, qty) =>
                sum + qty,
              0
            );


        htmlParts.push(`

          <div class="summary-product">

            <strong>
              ${escapeHtml(
                productName
              )}
              ×
              ${productTotal}
            </strong>

        `);


        textParts.push(
          `${productName} × ${productTotal}`
        );


        Object.entries(
          details
        ).forEach(
          ([detail, qty]) => {

            htmlParts.push(`

              <div class="summary-detail">
                ${
                  escapeHtml(detail) ||
                  "-"
                }
                ×
                ${qty}
              </div>

            `);


            textParts.push(
              `- ${detail || "-"} × ${qty}`
            );

          }
        );


        htmlParts.push(`
          </div>
        `);

      }
    );


    // =========================
    // 店家小計
    // =========================

    htmlParts.push(`

        <div class="store-summary-total">

          <div>
            店家杯數：
            <strong>
              ${storeCups}
            </strong>
          </div>

          <div>
            店家金額：
            <strong>
              $${storeAmount}
            </strong>
          </div>

        </div>

      </div>

    `);


    textParts.push(
      `店家杯數：${storeCups}`
    );

    textParts.push(
      `店家金額：$${storeAmount}`
    );

    textParts.push("");

  });


  // =========================
  // 全部訂單合計
  // =========================

  const totalCups =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(order.quantity),
      0
    );

  const totalAmount =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(order.total_price),
      0
    );


  htmlParts.push(`

    <div class="all-summary-total">

      <div>
        全部總杯數：
        <strong>
          ${totalCups}
        </strong>
      </div>

      <div>
        全部總金額：
        <strong>
          $${totalAmount}
        </strong>
      </div>

    </div>

  `);


  textParts.push(
    `全部總杯數：${totalCups}`
  );

  textParts.push(
    `全部總金額：$${totalAmount}`
  );


  // 顯示在網頁
  summaryEl.innerHTML =
    htmlParts.join("");


  // 給「複製店家訂單」按鈕使用
  latestSummaryText =
    textParts.join("\n");
}

document
  .getElementById("refreshBtn")
  .addEventListener(
    "click",
    loadOrders
  );

document
  .getElementById("deleteAllBtn")
  .addEventListener(
    "click",
    async () => {

      const confirmDelete =
        confirm(
          "確定要刪除全部訂單嗎？\n\n此操作無法復原！"
        );

      if (!confirmDelete) {
        return;
      }

      const secondConfirm =
        confirm(
          "再次確認：真的要清空所有訂單紀錄嗎？"
        );

      if (!secondConfirm) {
        return;
      }

      const deleteBtn =
        document.getElementById(
          "deleteAllBtn"
        );

      deleteBtn.disabled = true;
      deleteBtn.textContent =
        "刪除中...";

      const { error } =
        await supabaseClient
          .from("orders")
          .delete()
          .neq("id", 0);

      if (error) {
        console.error(error);

        alert(
          "刪除失敗：" +
          error.message
        );

        deleteBtn.disabled =
          false;

        deleteBtn.textContent =
          "刪除全部訂單";

        return;
      }

      alert(
        "全部訂單已刪除"
      );

      deleteBtn.disabled =
        false;

      deleteBtn.textContent =
        "刪除全部訂單";

      await loadOrders();
    }
  );

document
  .getElementById("copyBtn")
  .addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard
          .writeText(
            latestSummaryText
          );

        alert(
          "已複製店家訂單"
        );

      } catch (error) {

        console.error(error);

        alert(
          "複製失敗，請手動複製"
        );

      }

    }
  );

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    async () => {

      await supabaseClient
        .auth
        .signOut();

      window.location
        .replace(
          "login.html"
        );

    }
  );

supabaseClient.auth
  .onAuthStateChange(
    (event, session) => {

      if (
        event === "SIGNED_OUT" ||
        !session
      ) {

        window.location
          .replace(
            "login.html"
          );

      }

    }
  );

const storeTable =
  document.getElementById("storeTable");

const manageStore =
  document.getElementById("manageStore");

const storeMessage =
  document.getElementById("storeMessage");

const productTable =
  document.getElementById("productTable");

const productMessage =
  document.getElementById("productMessage");


function showAdminMessage(
  element,
  text,
  type = "ok"
) {

  element.className =
    `message ${type}`;

  element.textContent =
    text;

}


// ========================
// 載入店家
// ========================

async function loadStoresAdmin() {

  const { data, error } =
    await supabaseClient
      .from("stores")
      .select("*")
      .order("id");

  if (error) {

    showAdminMessage(
      storeMessage,
      error.message,
      "err"
    );

    return;

  }


  const stores = data || [];


  storeTable.innerHTML =
    stores.map(store => {

      return `

        <tr>
          <td>
            ${escapeHtml(store.name)}
          </td>

          <td>
            ${store.active
          ? "啟用"
          : "停用"
        }
          </td>

          <td>

<div
  style="
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    width:100%;
  "
>

  <button
    onclick="toggleStore(
      ${store.id},
      ${store.active}
    )"
    style="
      width:100%;
      margin:0;
    "
  >
    ${store.active
          ? "停用"
          : "啟用"
        }
  </button>

  <button
    onclick="deleteStore(
      ${store.id},
      '${escapeHtml(store.name)}'
    )"
    style="
      width:100%;
      margin:0;
      background:#dc3545;
    "
  >
    刪除
  </button>

</div>          </td>

        </tr>

      `;

    }).join("");


  manageStore.innerHTML =
    stores
      .filter(store => store.active)
      .map(store => {

        return `

          <option
            value="${store.id}"
          >
            ${escapeHtml(store.name)}
          </option>

        `;

      }).join("");


  if (manageStore.value) {

    loadProductsAdmin(
      manageStore.value
    );

  }

}
document
  .getElementById("addStoreBtn")
  .addEventListener(
    "click",
    async () => {

      const name =
        document
          .getElementById("newStoreName")
          .value
          .trim();


      if (!name) {

        showAdminMessage(
          storeMessage,
          "請輸入店家名稱",
          "err"
        );

        return;

      }


      const { error } =
        await supabaseClient
          .from("stores")
          .insert({

            name: name,

            active: true

          });


      if (error) {

        showAdminMessage(
          storeMessage,
          error.message,
          "err"
        );

        return;

      }


      document
        .getElementById(
          "newStoreName"
        )
        .value = "";


      showAdminMessage(
        storeMessage,
        "店家新增成功"
      );


      await loadStoresAdmin();

    }
  );

async function toggleStore(
  id,
  currentStatus
) {

  const { error } =
    await supabaseClient
      .from("stores")
      .update({
        active: !currentStatus
      })
      .eq(
        "id",
        id
      );

  if (error) {

    alert(
      "更新失敗：" +
      error.message
    );

    return;
  }

  await loadStoresAdmin();
}


async function deleteStore(
  storeId,
  storeName
) {

  const firstConfirm =
    confirm(
      `確定要刪除「${storeName}」嗎？\n\n該店家的所有飲料品項也會一起刪除！`
    );

  if (!firstConfirm) {
    return;
  }

  const secondConfirm =
    confirm(
      `再次確認：真的要永久刪除「${storeName}」嗎？\n\n此操作無法復原。`
    );

  if (!secondConfirm) {
    return;
  }

  try {

    const {
      error: productError
    } =
      await supabaseClient
        .from("products")
        .delete()
        .eq(
          "store_id",
          storeId
        );

    if (productError) {
      throw new Error(
        "刪除飲料失敗：" +
        productError.message
      );
    }

    const {
      error: storeError
    } =
      await supabaseClient
        .from("stores")
        .delete()
        .eq(
          "id",
          storeId
        );

    if (storeError) {
      throw new Error(
        "刪除店家失敗：" +
        storeError.message
      );
    }

    alert(
      `「${storeName}」已刪除`
    );

    await loadStoresAdmin();

  } catch (error) {

    console.error(error);

    alert(
      error.message
    );

  }
}

async function loadProductsAdmin(
  storeId
) {

  const { data, error } =
    await supabaseClient
      .from("products")
      .select("*")
      .eq(
        "store_id",
        storeId
      )
      .order("id");


  if (error) {

    showAdminMessage(
      productMessage,
      error.message,
      "err"
    );

    return;

  }


  const products =
    data || [];


  productTable.innerHTML =
    products.map(product => {

      return `

        <tr>
          <td>
            ${escapeHtml(
        product.name
      )}
          </td>

          <td>
            ${product.price_m != null
          ? "$" + product.price_m
          : "-"
        }
</td>

<td>
  ${product.price_l != null
          ? "$" + product.price_l
          : (
            product.price != null
              ? "$" + product.price
              : "-"
          )
        }
          </td>

          <td>

            ${product.active
          ? "啟用"
          : "停用"
        }

          </td>

          <td>

            <div
  style="
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    width:100%;
  "
>

  <button
    onclick="toggleProduct(
      ${product.id},
      ${product.active}
    )"
    style="
      width:100%;
      margin:0;
    "
  >
    ${product.active
          ? "停用"
          : "啟用"
        }
  </button>

  <button
    onclick="deleteProduct(
      ${product.id},
      '${escapeHtml(product.name)}'
    )"
    style="
      width:100%;
      margin:0;
      background:#dc3545;
    "
  >
    刪除
    
  </button>

</div>

          </td>

        </tr>

      `;

    }).join("");

}

manageStore
  .addEventListener(
    "change",
    () => {

      loadProductsAdmin(
        manageStore.value
      );

    }
  );

document
  .getElementById("addProductBtn")
  .addEventListener(
    "click",
    async () => {

      const storeId =
        manageStore.value;

      const name =
        document
          .getElementById(
            "productName"
          )
          .value
          .trim();

      const priceMRaw =
        document
          .getElementById("productPriceM")
          .value
          .trim();

      const priceLRaw =
        document
          .getElementById("productPriceL")
          .value
          .trim();

      const priceM =
        priceMRaw === ""
          ? null
          : Number(priceMRaw);

      const priceL =
        priceLRaw === ""
          ? null
          : Number(priceLRaw);


      if (!storeId) {

        showAdminMessage(
          productMessage,
          "請先建立店家",
          "err"
        );

        return;

      }


      if (!name) {

        showAdminMessage(
          productMessage,
          "請輸入飲料名稱",
          "err"
        );

        return;

      }


      if (
        priceM === null &&
        priceL === null
      ) {

        showAdminMessage(
          productMessage,
          "M / L 至少輸入一個價格",
          "err"
        );

        return;
      }

      if (
        (
          priceM !== null &&
          (
            !Number.isFinite(priceM) ||
            priceM < 0
          )
        ) ||
        (
          priceL !== null &&
          (
            !Number.isFinite(priceL) ||
            priceL < 0
          )
        )
      ) {

        showAdminMessage(
          productMessage,
          "請輸入正確的 M / L 價格",
          "err"
        );

        return;
      }


      const { error } =
        await supabaseClient
          .from("products")
          .insert({

            store_id:
              Number(storeId),

            name:
              name,

            // 相容舊 price 欄位
            // 有 L 優先使用 L，沒有 L 就使用 M
            price:
              priceL ?? priceM,

            price_m:
              priceM,

            price_l:
              priceL,

            active:
              true

          });


      if (error) {

        showAdminMessage(
          productMessage,
          error.message,
          "err"
        );

        return;

      }


      document
        .getElementById(
          "productName"
        )
        .value = "";


      document
        .getElementById("productPriceM")
        .value = "";

      document
        .getElementById("productPriceL")
        .value = "";


      showAdminMessage(
        productMessage,
        "飲料新增成功"
      );


      await loadProductsAdmin(
        storeId
      );

    }
  );

async function toggleProduct(
  id,
  currentStatus
) {

  const { error } =
    await supabaseClient
      .from("products")
      .update({

        active:
          !currentStatus

      })
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      "更新失敗：" +
      error.message
    );

    return;

  }


  loadProductsAdmin(
    manageStore.value
  );

}


async function initAdminPage() {

  const loggedIn =
    await requireLogin();

  if (!loggedIn) {
    return;
  }

  await Promise.all([
    loadOrders(),
    loadStoresAdmin()
  ]);
}

async function deleteProduct(
  productId,
  productName
) {

  const firstConfirm =
    confirm(
      `確定要刪除「${productName}」嗎？`
    );

  if (!firstConfirm) {
    return;
  }

  const secondConfirm =
    confirm(
      `再次確認：真的要永久刪除「${productName}」嗎？\n\n此操作無法復原。`
    );

  if (!secondConfirm) {
    return;
  }

  try {

    const { error } =
      await supabaseClient
        .from("products")
        .delete()
        .eq(
          "id",
          productId
        );

    if (error) {
      throw error;
    }

    alert(
      `「${productName}」已刪除`
    );

    await loadProductsAdmin(
      manageStore.value
    );

  } catch (error) {

    console.error(error);

    alert(
      "刪除飲料失敗：" +
      error.message
    );

  }
}
initAdminPage();