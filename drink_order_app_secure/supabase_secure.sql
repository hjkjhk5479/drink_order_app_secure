-- 先執行原本 supabase.sql，再執行這份安全設定

-- 移除任何人都能讀取訂單的政策
drop policy if exists "orders_read_all" on public.orders;

-- 只有登入 Supabase Auth 的使用者可以讀取訂單
drop policy if exists "orders_read_authenticated" on public.orders;
create policy "orders_read_authenticated"
on public.orders
for select
to authenticated
using (true);

-- 一般使用者仍可以送出訂單
drop policy if exists "orders_insert_all" on public.orders;
create policy "orders_insert_all"
on public.orders
for insert
to anon, authenticated
with check (true);

-- 菜單保持公開可讀
-- stores / products / toppings 原本的 select policy 可保留
