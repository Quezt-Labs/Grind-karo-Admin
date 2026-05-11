# Coaching Plan Users — Admin API

Reference for the Admin dashboard to list users subscribed to specific coaching plans (e.g., MINI, MEGA, ULTRA).

## Endpoint

`GET /admin/users/by-plan/:planId`

- **Auth:** Required (JWT + Admin role)
- **Status:** New

## Query Parameters

| Parameter | Type     | Default | Description                                       |
| :-------- | :------- | :------ | :------------------------------------------------ |
| `status`  | `string` | `all`   | Filter by sub status: `active`, `past`, or `all`. |
| `limit`   | `number` | `50`    | Pagination: items per page (max 500).             |
| `offset`  | `number` | `0`     | Pagination: items to skip.                        |

### Status Filter Logic

- **`active`**: User has an `ACTIVE` status, the subscription has not expired (`expiresAt > now`), and payment is verified.
- **`past`**: User's subscription is `EXPIRED`, `CANCELLED`, or `ACTIVE` but past its expiration date.
- **`all`**: Every subscription attempt for this plan, regardless of status or expiration.

## Response Structure

Returns a paginated list of users and their specific subscription details for the requested plan.

```typescript
interface ListPlanUsersResponse {
  total: number;
  limit: number;
  offset: number;
  items: PlanUserItem[];
}

interface PlanUserItem {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "ADMIN";
    plan: "FREE" | "PRO" | "ENTERPRISE" | null;
    createdAt: string;
    updatedAt: string;
  };
  subscription: {
    id: string;
    status: "ACTIVE" | "EXPIRED" | "CANCELLED";
    startDate: string;
    expiresAt: string;
    totalAmount: number;
    razorpayPaymentId: string | null;
    createdAt: string;
  };
}
```

## Example Usage

### 1. Fetching Active Members (MEGA Plan)

```bash
# Assuming planId for MEGA is '3b8...'
GET /admin/users/by-plan/3b8...-...?status=active
```

### 2. Exporting / Listing Past Members

```bash
GET /admin/users/by-plan/3b8...-...?status=past&limit=100
```

## FE Implementation Notes

- **Sorting:** Results are returned newest first (`subscription.createdAt` desc).
- **Navigation:** When a user is clicked, you can use `user.id` to navigate to the full user profile at `/admin/users/:id`.
- **Empty State:** If a plan has no subscribers for the given filter, `items` will be `[]` and `total` will be `0`.
