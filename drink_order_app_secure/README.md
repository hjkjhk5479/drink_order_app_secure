# 飲料訂購系統

## 功能
- 選店家
- 選飲料
- 甜度 / 冰塊 / 加料
- 數量
- 自動計算金額
- Supabase 儲存訂單
- 管理頁查看訂單
- 自動統計總杯數 / 總金額
- 自動整理店家下單格式
- 一鍵複製統計

## 建置步驟

### 1. 建立 Supabase 專案
到 Supabase 建立新 Project。

### 2. 建立資料表
進入：
SQL Editor > New query

貼上 `supabase.sql` 全部內容，按 Run。

### 3. 找到 Supabase API 資訊
進入：
Project Settings > API

找到：
- Project URL
- anon / public key

### 4. 修改 config.js

把：

```js
window.SUPABASE_URL = "YOUR_SUPABASE_URL";
window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

改成自己的值。

注意：
瀏覽器前端只能放 anon key，不能放 service_role key。

### 5. 本機測試

不要直接雙擊 HTML。
建議用 VS Code + Live Server。

安裝 Live Server 後：
右鍵 index.html > Open with Live Server

訂購頁：
index.html

管理頁：
admin.html

### 6. 新增正式菜單

到 Supabase：
Table Editor > stores
新增店家。

再到：
products
新增飲料品項，store_id 填對應店家 id。

toppings
新增該店家加料。

### 7. 部署

可以部署到：
- Vercel
- Netlify
- GitHub Pages

純 HTML/CSS/JS，不需要 Node.js Server。

## 正式上線前建議
目前 admin.html 沒有登入保護，任何拿到網址的人都可以看訂單。
正式公司使用時，建議第二版加入：
- Supabase Auth
- 管理員登入
- 訂購活動 / 截止時間
- 每人修改自己的訂單
- 刪除訂單
- CSV / Excel 匯出
- QR Code
