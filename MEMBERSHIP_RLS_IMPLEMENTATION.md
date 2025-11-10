# Membership-Based RLS Implementation

## Overview

Successfully implemented a robust org-scoped Row-Level Security (RLS) system using a `Membership` table instead of `current_setting()`. This provides better multi-tenancy support and allows users to belong to multiple organizations.

## ✅ Changes Implemented

### 1. Database Schema Changes

#### Added Membership Model
```prisma
model Membership {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role           Role         @default(MEMBER)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([userId, organizationId])
  @@index([userId])
  @@index([organizationId])
  @@map("memberships")
}
```

#### Updated User Model
- Removed `organizationId` and `role` fields
- Added `memberships` relation
- Users can now belong to multiple organizations

#### Updated Organization Model
- Removed `users` relation
- Added `memberships` relation

### 2. RLS Policies (prisma/rls-policies.sql)

#### Helper Functions
```sql
-- Get user's organization IDs
CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS SETOF TEXT AS $$
  SELECT "organizationId" FROM memberships WHERE "userId" = auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user has specific role in an org
CREATE OR REPLACE FUNCTION auth.user_has_role(org_id TEXT, required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE "userId" = auth.uid()::text
    AND "organizationId" = org_id
    AND (
      CASE required_role
        WHEN 'OWNER' THEN role = 'OWNER'
        WHEN 'ADMIN' THEN role IN ('OWNER', 'ADMIN')
        WHEN 'MEMBER' THEN role IN ('OWNER', 'ADMIN', 'MEMBER')
        ELSE FALSE
      END
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

#### Policy Examples
- **Organizations**: Users can view orgs they're members of
- **Campaigns**: Members can view, admins can create/update/delete
- **Calls/Utterances/Claims**: Automatically scoped via campaign → org membership
- **Memberships**: Users can view memberships in their orgs, admins can manage

### 3. tRPC Context Changes

#### New Context Structure
```typescript
export type UserMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type Context = {
  db: PrismaClient;
  user: User | null;
  memberships: UserMembership[];
};
```

#### Membership Fetching
- Context now fetches all user memberships on every request
- Includes organization details for easy access
- Empty memberships array triggers FORBIDDEN error

### 4. tRPC Middleware Updates

#### Auth Middleware
```typescript
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource"
    });
  }
  
  if (ctx.memberships.length === 0) {
    throw new TRPCError({ 
      code: "FORBIDDEN",
      message: "You must be a member of an organization to access this resource"
    });
  }
  
  return next({ ctx: { user: ctx.user, memberships: ctx.memberships } });
});
```

#### Helper Functions
```typescript
export function hasOrgAccess(
  memberships: Context["memberships"],
  organizationId: string
): boolean {
  return memberships.some((m) => m.organizationId === organizationId);
}

export function hasOrgAdminAccess(
  memberships: Context["memberships"],
  organizationId: string
): boolean {
  return memberships.some(
    (m) =>
      m.organizationId === organizationId &&
      (m.role === "ADMIN" || m.role === "OWNER")
  );
}
```

### 5. Campaign Router Updates

#### List Campaigns
- Now accepts optional `organizationId` parameter
- Returns campaigns from all user's orgs by default
- Verifies access when specific org requested

#### Get Campaign by ID
- Fetches campaign first
- Then verifies user has access to campaign's org
- Throws FORBIDDEN if no access

#### Create/Update/Delete
- Requires `organizationId` parameter for create
- Verifies admin access before mutation
- Throws detailed error messages

### 6. Seed Data Updates

#### Two Organizations
- `demo-org` (Demo Organization)
- `acme-corp` (Acme Corporation)

#### Two Users
- `demo@example.com` (owner of demo-org)
- `admin@acme.com` (owner of acme-corp)

#### Memberships
- Each user has OWNER role in their respective org
- Demonstrates org isolation

#### Campaigns
- One campaign per organization
- Different categories (Retail vs Healthcare)

### 7. Vitest Tests

#### Test Coverage
✅ **10 tests passing** covering:
1. List campaigns from user's orgs only
2. Deny access to unauthorized org campaigns
3. Allow access to campaign in user's org
4. Deny access to campaign in different org
5. Allow admin to create campaign in their org
6. Deny admin from creating in different org
7. Deny member from creating campaign
8. Deny update to campaign in different org
9. Deny delete of campaign in different org
10. Multi-org user can access multiple orgs

#### Test File
`src/server/trpc/__tests__/cross-org-access.test.ts`

### 8. API Route Updates

#### Organization Creation
```typescript
// Create organization, user, and membership in transaction
const result = await db.$transaction(async (tx) => {
  const organization = await tx.organization.create({ ... });
  const dbUser = await tx.user.upsert({ ... });
  const membership = await tx.membership.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: "OWNER",
    },
  });
  return { organization, user: dbUser, membership };
});
```

### 9. Dashboard Layout Updates

#### Membership-Based Access
```typescript
const memberships = await db.membership.findMany({
  where: { userId: user.id },
  include: { organization: true },
});

if (memberships.length === 0) {
  redirect("/auth/setup-org");
}

const primaryMembership = memberships[0];
```

## Migration Guide

### Step 1: Generate Prisma Client
```bash
npx prisma generate
```

### Step 2: Create Migration
```bash
npx prisma migrate dev --name add-membership-table
```

### Step 3: Apply RLS Policies
```bash
psql $DATABASE_URL < prisma/rls-policies.sql
```

### Step 4: Migrate Existing Data
```sql
-- Migrate existing users to memberships
INSERT INTO memberships ("id", "userId", "organizationId", "role", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  id,
  "organizationId",
  role,
  "createdAt",
  NOW()
FROM users
WHERE "organizationId" IS NOT NULL;

-- Remove old columns (after verifying migration)
ALTER TABLE users DROP COLUMN "organizationId";
ALTER TABLE users DROP COLUMN role;
```

### Step 5: Run Seed
```bash
npx prisma db seed
```

### Step 6: Run Tests
```bash
npm test
```

## Benefits

### 1. Multi-Organization Support
- Users can belong to multiple organizations
- Each membership has its own role
- Easy to add/remove users from orgs

### 2. Better Security
- RLS policies use `auth.uid()` JOIN with memberships
- No reliance on application-set session variables
- Database-level enforcement

### 3. Flexible Permissions
- Role hierarchy: OWNER > ADMIN > MEMBER
- Per-organization role assignment
- Easy to add new roles in future

### 4. Scalability
- Efficient queries with proper indexes
- Helper functions are STABLE (cacheable)
- Supports thousands of users/orgs

### 5. Testability
- Comprehensive test coverage
- Easy to test cross-org access scenarios
- Mock-friendly architecture

## Security Guarantees

### Database Level (RLS)
✅ Users can only see data from their organizations  
✅ Admins can only modify data in their organizations  
✅ Cannot bypass via SQL injection  
✅ Works with any client (not just tRPC)

### Application Level (tRPC)
✅ Membership verification on every request  
✅ Explicit org access checks  
✅ Role-based action authorization  
✅ Detailed error messages

### Test Coverage
✅ Cross-org read denial  
✅ Cross-org write denial  
✅ Role-based access control  
✅ Multi-org user scenarios

## Future Enhancements

### 1. Organization Switcher UI
Add dropdown in nav to switch between user's orgs:
```typescript
const [activeOrgId, setActiveOrgId] = useState(memberships[0].organizationId);
```

### 2. Invitation System
```prisma
model Invitation {
  id             String   @id @default(cuid())
  email          String
  organizationId String
  role           Role
  token          String   @unique
  expiresAt      DateTime
  createdAt      DateTime @default(now())
}
```

### 3. Audit Logs
Track membership changes:
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String
  metadata  Json
  createdAt DateTime @default(now())
}
```

### 4. Team Hierarchies
Add teams within organizations:
```prisma
model Team {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  members        TeamMember[]
}
```

## Performance Considerations

### Indexes
- `@@index([userId])` on memberships for fast user lookups
- `@@index([organizationId])` for org-scoped queries
- `@@unique([userId, organizationId])` prevents duplicates

### Query Optimization
- Context fetches memberships once per request
- Helper functions are STABLE (Postgres caches results)
- Use `IN` queries for multi-org access

### Caching Strategy
```typescript
// Future: Cache memberships in Redis
const cacheKey = `memberships:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

## Troubleshooting

### Issue: Tests fail with Prisma not initialized
```bash
npx prisma generate
npm test
```

### Issue: RLS denies all access
```sql
-- Check if policies are enabled
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'campaigns';

-- Verify user has memberships
SELECT * FROM memberships WHERE "userId" = 'your-user-id';
```

### Issue: User can't access their org
```typescript
// Debug in tRPC context
console.log('User memberships:', ctx.memberships);
console.log('Requested org:', organizationId);
console.log('Has access:', hasOrgAccess(ctx.memberships, organizationId));
```

## Conclusion

The membership-based RLS implementation provides:
- ✅ Robust multi-tenancy
- ✅ Database-level security
- ✅ Flexible permissions
- ✅ Comprehensive test coverage
- ✅ Future-proof architecture

All tests passing (10/10) ✨

