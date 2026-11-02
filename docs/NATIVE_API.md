# Native API contract

Configure `src/services/config.js` to select `mock` or `api`. The base URL ends in `/api`. JSON requests use `Content-Type: application/json`; uploads use multipart FormData with field `image`. Successful responses are JSON. Errors return an appropriate HTTP status and `{ "message": "Actionable explanation" }`. Do not return HTML error pages. `/auth/me` returning 401 represents no session and shows Welcome; protected endpoint 401s require login. Invalid login credentials stay on the login form.

Use server-managed HttpOnly session cookies and server-side ownership checks. No fabricated frontend JWT is used. Native cookie persistence and your domain/TLS policy need on-device testing with your backend. Keep passwords and OTP secrets on the server. AsyncStorage contains only local synthetic demo records and a local demo-session flag, never user passwords or API tokens.

## Endpoints

| Method | Path | Payload / response |
|---|---|---|
| GET | /auth/me | `{user, shop}`; 401 if unauthenticated |
| POST | /auth/login | `{phone,password}` → `{user,shop}` and session cookie |
| POST | /auth/demo | `{}` → seeded demo session (disable in production) |
| POST | /auth/register | `{fullName,cnic,phone,password,shopName,address}` → message; user logs in next |
| POST | /auth/logout | revoke session and clear cookie |
| POST | /auth/recover-password | `{phone}` → generic message; implement SMS/identity workflow |
| POST | /auth/change-password | `{currentPassword,newPassword}` → message; revoke other sessions |
| GET | /auth/sessions | `[{id,device,current,createdAt}]` |
| DELETE | /auth/sessions/:id | revoke owned noncurrent session |
| GET/PATCH | /shop/me | Shop / `{address,deliveryRadiusKm,holidays?}` |
| PATCH | /shop/status | `{status: "active" | "busy" | "closed"}` |
| PATCH | /shop/hours | `{Mon:{open:"08:00",close:"23:00"},...Sun}` |
| GET | /shop/verification | `{status,requests:[{id,shopName,status,document?,createdAt}]}` |
| POST | /shop/verification | `{shopName,document?}` → pending request; never self-approve |
| GET | /products | Product array |
| POST/PATCH | /products[/:id] | Product editable fields |
| DELETE | /products/:id | enforce active-order protection, then audit deletion |
| POST | /uploads | multipart `image` → `{url:"/uploads/owned-image.jpg"}` |
| GET | /inventory/history | `[{id,productName,actionType,previousQuantity,newQuantity,timestamp}]` newest first |
| GET | /orders | Order array scoped to current shop segment |
| GET | /orders/:id | Order |
| POST | /orders/:id/accept | `{}` |
| POST | /orders/:id/reject | `{reason}` |
| POST | /orders/:id/start-preparing | `{}` |
| POST | /orders/:id/confirm-packing | `{checkedItems:[productId,...],items:[{productId,quantity},...]}`; verify exact quantities on server |
| POST | /orders/:id/verify-pickup-otp | `{otp}` → updated Order, or 4xx; verify hash/expiry/attempts/reuse on server |
| GET | /earnings | `{transactions:[...]}`; native adapter also loads `/orders` to calculate reports |
| GET | /rewards | `{points,history:[...]}` (`ledger` is also accepted) |
| GET | /notifications | Notification array |
| PATCH | /notifications/:id/read | `{}` |
| POST | /notifications/read-all | `{}` |
| GET/POST | /support/tickets | array / `{subject,description,issueType,attachment?}` |
| GET/POST | /support/tickets/:id/messages | array / `{body}` |

`/shop/hours` is saved first, then holiday dates are PATCHed to `/shop/me` as `holidays: ["2026-12-25"]`. These are two endpoint operations; for atomic updates, expose a combined backend operation and update the adapter.

The local-only demo helper uses `POST /demo/orders` and `POST /orders/:id/deliver`; those controls are hidden in API mode. Delivery/payment completion belongs to the rider/customer/server integration. No production payment endpoint is invoked by this client.

## Shared record shapes

```ts
type User = {fullName: string; phone: string};
type Shop = {
 shopName: string; address: string;
 status: 'active' | 'busy' | 'closed';
 verificationStatus: 'Verified' | 'Pending' | 'Rejected';
 deliveryRadiusKm: number; holidays: string[];
 workingHours: Record<'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun', {open:string;close:string}>;
};
type Product = {
 id:string; name:string; category:'Fruits'|'Vegetables'|'Dairy'|'Bakery'|'Grocery'|'Others';
 pricePkr:number; quantity:number; reserved:number;
 unit:'kg'|'g'|'L'|'ml'|'pcs'|'dozen'|'pack';
 description:string; imageUrl:string; isAvailable:boolean; emoji?:string;
};
type Order = {
 id:string; orderNumber:string; customer:{name:string;phone:string}; address:string;
 items:{productId:string;name:string;quantity:number;price:number;emoji?:string}[];
 subtotal:number; deliveryFee:number; total:number;
 status:'New'|'Accepted'|'Preparing'|'Ready for Pickup'|'Handed Over'|'Delivered'|'Rejected'|'Cancelled';
 paymentMethod:string; paymentStatus:string; instructions:string;
 createdAt:string; preparationStartedAt?:string; updatedAt?:string; isDemo:boolean;
 rider?:{name:string;phone:string;bikeModel:string;licensePlate:string};
 rejectionReason?:string; customerResolution?:string;
};
type Transaction = {
 id:string;orderId:string;amount:number;commission:number;settlementAmount:number;
 settled:boolean;paymentMethod:string;paymentStatus:string;createdAt:string;isDemoTransaction:boolean;
};
type Notification = {id:string;title:string;category:'Orders'|'System'|'Offers';orderId?:string;read:boolean;createdAt:string};
type Ticket = {id:string;subject:string;status:string;createdAt:string;attachment?:string};
type Message = {id:string;author:string;body:string;createdAt:string};
```

Use ISO timestamps and PKR amounts consistently. Current daily bucket calculations use UTC dates; add the shop timezone to your aggregation endpoints for Pakistan-local settlement boundaries.

## Required backend invariants

- Hash passwords; rate limit login/recovery; enforce shop ownership on every read/write/upload/socket room.
- Validate availability and reserve stock atomically on acceptance. Reject duplicate transitions. At handover, deduct physical stock and release the reservation exactly once. Cancellation/rejection must release applicable reservations. Never oversell or allow negative stock.
- Verify pickup OTP only on the server. Expire and invalidate it after handover; rate limit attempts. `4587` is only a labelled local demo fixture, never a production OTP.
- Reject only the affected shop segment. Customer approval offers switch affected items or remove that segment; preserve other shops.
- Enforce closed/busy capacity on assignments server-side; preserve accepted orders. Enforce maximum 5 km pickup/service radius, maximum five shops per rider pickup batch, and extra fee after three shops in the customer/rider backend.
- Derive earnings from an idempotent ledger. Mark demo transactions. Integrate Easypaisa/JazzCash/bank services only when ready; no frontend live-transfer simulation.
- Approve verification only through an administrator. Store uploads outside the JS bundle; validate type, size and ownership. Native screens accept absolute HTTPS URLs or same-server `/uploads/...` paths.
- Add push notifications and Socket.IO as needed. Current API client refetches on foreground, mutations, pull-to-refresh and every 15 seconds while active; no realtime socket connection is claimed.

The optional pre-existing `backend/` has its own web adapter contract. Most paths match. Its packing endpoint expects `items`; the native client sends both checklist IDs and item quantities. No new production backend was created for this native implementation.
