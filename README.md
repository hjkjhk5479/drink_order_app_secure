# 飲料訂購系統

純 HTML、CSS、JavaScript，透過 Supabase 儲存資料與管理員登入，沒有建置步驟或 Node.js 後端。

## 功能

- 訂購：店家與圖示、飲料、M／L 或單一價、甜度、冰塊、加料與備註。
- 杯數 1–99，可手動輸入或使用加減按鈕。
- 管理：訂單統計、依店家整理與複製、單筆或全部刪單。
- 店家與飲料新增、啟用／停用、刪除。
- 管理者登入／登出。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| index.html / app.js | 訂購頁 |
| admin.html / admin.js | 訂單及菜單管理 |
| login.html / login.js | 管理者登入 |
| shared.js | 共用資料與 UI 工具 |
| config.js | Supabase URL 與公開金鑰 |
| style.css | 共用樣式 |

## 執行與部署

使用本機 HTTP 伺服器（例如 VS Code Live Server）開啟 index.html。
部署時包含上述 HTML、JavaScript 與 CSS，尤其 shared.js。

本專案使用 config.js 指定的既有 Supabase 資料庫。
SQL 設定檔與本機測試工具已依要求移除；新建資料庫須另外設定資料表及權限。
移除本機檔案不會更動線上資料庫。

## 資料相容與限制

- 保留舊菜單 price 欄位，有 M／L 時使用尺寸價格。
- 尺寸保存在 orders.product_name。
- 加料、店家 Logo 與排序可透過 Supabase Table Editor 維護。
- 已有訂單引用的店家／飲料可能無法直接刪除，可先停用保留歷史。
- 管理頁統計跨日期全部訂單；尚未提供訂購活動及付款管理。
- 所有 Auth 帳號仍視為管理者，請參考 SECURITY_SETUP.md。
- 訂單金額仍由前端送出，資料庫端菜單驗價尚未實作。