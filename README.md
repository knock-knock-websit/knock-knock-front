# KNOCK-KNOCK Frontend

獨立的 Next.js 16 前台，僅透過 HTTP API 讀取商品與建立訂單，不直接連線資料庫。

## 啟動

1. 執行 `npm install`。
2. 複製 `.env.example` 為 `.env.local`。
3. 將 `API_URL` 指向 `knock-knock-backend`。
4. 執行 `npm run dev`，開啟 `http://localhost:3000`。

`API_URL` 只在 Next.js 伺服器端使用；瀏覽器透過同源 `/api/*` 呼叫，不需要知道 Worker 網址。`NEXT_PUBLIC_SITE_URL` 用於 Canonical、Sitemap 與結構化資料。

## 前台商品 API

Next.js 提供同源 BFF API，瀏覽器不需直接跨網域呼叫 Worker：

- `GET /api/products`：商品列表，支援搜尋、分類、價格、排序與分頁
- `GET /api/products/:slug`：商品詳情
- `GET /api/product-categories`：商品分類與商品數量
- `POST /api/auth/register`：會員註冊
- `POST /api/auth/verify-email`：驗證 Email 驗證碼
- `POST /api/auth/resend-verification`：重新寄送驗證碼
- `POST /api/auth/login`、`POST /api/auth/logout`：會員登入與登出
- `POST /api/auth/request-password-reset`：寄送一次性重設密碼網址
- `POST /api/auth/reset-password`：使用網址 Token 設定新密碼
- `GET /api/members/overview`：會員累積訂單、收藏商品與可用優惠券數量
- `GET /api/members/favorites`：取得目前會員的收藏商品
- `POST /api/members/favorites`：新增收藏商品
- `DELETE /api/members/favorites/:productId`：移除收藏商品
- `POST /api/orders`：建立訂單，登入時會帶入會員 token

商品列表頁會在篩選條件變更後呼叫 `/api/products`。商品與分類皆以 `knock-knock-backend` 後台寫入 D1 的資料為唯一來源；前台不內建假商品，後端無法連線時同源 API 會回傳 `502`。
