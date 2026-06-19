# Battle Arena Backend Integration Guide

## Overview
Successfully integrated backend API with frontend using a centralized API client located at `frontend/lib/api.ts`.

## Files Created
- **`frontend/lib/api.ts`** - Centralized API client for all backend communication
- **`frontend/.env.local`** - Environment configuration for API URL

## Files Modified
1. **`frontend/app/create-battle/page.tsx`**
   - Added username input field
   - Integrated `createBattle()` API call
   - Added error handling and loading states
   - Stores username in sessionStorage before navigation

2. **`frontend/app/join-battle/page.tsx`**
   - Replaced raw fetch with `joinBattle()` API call
   - Improved error handling with ApiError class
   - Stores username in sessionStorage before navigation

3. **`frontend/app/lobby/[roomId]/page.tsx`**
   - Replaced raw fetch with `getBattle()` API call
   - Imported Player and Battle types from API client
   - Improved error handling with ApiError class

## API Client Features (`frontend/lib/api.ts`)

### Exported Functions
- `createBattle()` - Create a new battle room
- `joinBattle()` - Join an existing battle room
- `getBattle()` - Fetch battle details by room code
- `leaveBattle()` - Leave a battle room (ready for future integration)
- `storeUsername()` - Store username in sessionStorage
- `getStoredUsername()` - Retrieve stored username
- `clearStoredUsername()` - Clear stored username
- `storeRoomCode()` - Store room code in sessionStorage
- `getStoredRoomCode()` - Retrieve stored room code
- `clearStoredRoomCode()` - Clear stored room code

### Exported Types
- `Player` - Player interface
- `Battle` - Battle room interface
- `ApiResponse<T>` - Standard API response format
- `ApiError` - Custom error class for API errors

### Error Handling
The API client includes:
- Custom `ApiError` class that extends `Error`
- Network error detection
- Type-safe error handling in all pages
- User-friendly error messages

### Configuration
Backend API URL is configured via `NEXT_PUBLIC_API_URL` environment variable in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Usage Example
```typescript
import { createBattle, joinBattle, storeUsername, ApiError } from "@/lib/api";

try {
  const battle = await joinBattle("ROOMCODE", "username");
  storeUsername("username");
  // Navigate to lobby
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.serverMessage);
  }
}
```

## Backend Endpoints Used
- `POST /api/battle/create` - Create battle
- `POST /api/battle/join` - Join battle
- `GET /api/battle/:roomCode` - Get battle details
- `POST /api/battle/leave` - Leave battle

## Next Steps
1. Ensure backend is running on `http://localhost:5000`
2. Test battle creation and joining flows
3. Socket.io integration for real-time updates (Phase 3)
4. Production environment configuration for API URL
