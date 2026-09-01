# 管理頁安全設定

## 1. 首頁已隱藏管理入口
`index.html` 不再顯示 `admin.html` 的連結。

注意：只隱藏連結不等於安全，所以還需要下面的登入與 RLS。

## 2. 執行 Supabase 安全 SQL
到 Supabase：
SQL Editor > New query

執行：
`supabase_secure.sql`

作用：
- 未登入使用者不能讀取 orders
- 已登入使用者才能查看 orders
- 一般同事仍可送出訂單

## 3. 建立管理員帳號
到 Supabase：
Authentication > Users > Add user

輸入管理員 Email 與密碼。

建議關閉不必要的自行註冊功能，只由管理者手動建立帳號。

## 4. 管理員登入網址
管理員開：
`login.html`

登入成功後才會進入：
`admin.html`

若直接開 `admin.html`，沒有登入會自動跳回 `login.html`。

## 5. 一般同事
一般同事只需要：
`index.html`

首頁完全不會顯示管理者入口。

## 6. 更嚴格的正式版建議
目前「所有已登入帳號」都可以看管理頁。
若未來要有多個帳號，建議再加：
- admin_users 資料表
- role 欄位
- RLS 判斷只有 role=admin 才能讀 orders
