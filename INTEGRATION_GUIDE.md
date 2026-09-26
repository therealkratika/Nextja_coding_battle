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
The frontend uses `https://nextja-coding-battle.onrender.com` as its backend API and socket server URL.

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

## Code Execution
Submissions are executed by a Piston instance. By default the backend connects to a self-hosted instance at `http://localhost:2000/api/v2/execute`; start Piston separately and install the language runtimes used by your questions. For a self-hosted Piston checkout, install runtimes on the Piston host with commands such as `cli/index.js ppman install python`, `cli/index.js ppman install javascript`, `cli/index.js ppman install c++`, and `cli/index.js ppman install java`. Confirm what is available from the Piston `/api/v2/runtimes` endpoint. Set `PISTON_URL` in the backend environment to use another Piston-compatible endpoint.

The official public Piston API now requires authorization. To use it, set `PISTON_URL=https://emkc.org/api/v2/piston/execute` and configure `PISTON_API_KEY` in the **backend** environment. Keep this key server-side; do not put it in a `NEXT_PUBLIC_*` variable or frontend environment file. Self-hosting instructions are available in the [Piston repository](https://github.com/engineer-man/piston).

## Next Steps
1. Seed the question database with `cd backend && npm run seed:questions` (safe to run repeatedly).
2. Ensure the backend is available at `https://nextja-coding-battle.onrender.com`
3. Test battle creation and joining flows
4. Keep the frontend API and socket URLs pointed at the deployed backend
