# TripCraft Chat Feature - Complete Implementation Plan
*Last updated: Audit fixes applied*

## Overview
Full chat system using MongoDB + polling. 1:1 chats, group chats, trip-based groups, offline SQLite queue, and BLE P2P for no-internet areas.

---

## Tab Bar Change
```
Before: Home | Map      | History | Profile
After:  Home | Chat     | History | Profile
        icon:  chatbubbles
```
Map stays inside trip detail screen only.

---

# BACKEND

## New MongoDB Models

### Conversation (`models/Conversation.js`)
```js
{
  type: { type: String, enum: ['1:1', 'group', 'trip-group'], required: true },
  name: { type: String },                          // null for 1:1, required for groups
  tripId: { type: ObjectId, ref: 'Trip' },          // only for trip-groups
  destination: { type: String },                     // for trip-group discovery
  participants: [{
    userId: { type: ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    joinedAt: { type: Date, default: Date.now },
  }],
  createdBy: { type: ObjectId, ref: 'User', required: true },
  lastMessage: {
    text: { type: String },
    senderId: { type: ObjectId },
    senderName: { type: String },
    timestamp: { type: Date },
    type: { type: String, default: 'text' },
  },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}
// Indexes:
//   'participants.userId' - find conversations for a user
//   'tripId' - find trip-group
//   'destination' - discover groups
//   'updatedAt' - sort by recent
```

### Message (`models/Message.js`)
```js
{
  conversationId: { type: ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['text', 'location', 'trip-share', 'system'], default: 'text' },
  metadata: { type: Mixed },       // { lat, lng } for location, { tripId, destination } for trip-share
  readBy: [{ type: ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
}
// Compound index: { conversationId: 1, createdAt: -1 }
```

### Friend (`models/Friend.js`)
```js
{
  userId: { type: ObjectId, ref: 'User', required: true },
  friendId: { type: ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
}
// Unique compound index: { userId: 1, friendId: 1 }
```

---

## Backend API Endpoints (`routes/chat.js`)

### Conversations

**GET /api/chat/conversations**
List all conversations for current user, sorted by most recent.
```
Response: {
  conversations: [
    {
      _id, type, name, destination,
      participants: [{ userId, name, avatar }],
      lastMessage: { text, senderName, timestamp, type },
      unreadCount: 3,
      updatedAt
    }
  ]
}
```
Query: `Conversation.find({ 'participants.userId': userId }).sort({ updatedAt: -1 }).limit(50)`
Unread: Count messages in conversation where `createdAt > user's lastRead` and `senderId !== userId`

**POST /api/chat/conversations**
Create new conversation.
```
Body: {
  type: '1:1' | 'group',
  participantIds: ['mongoUserId1', 'mongoUserId2'],  // for 1:1
  name: 'Group Name',                                 // for group
}
Response: { conversation }
```
For 1:1: Check if conversation already exists between these 2 users. If yes, return existing.

**GET /api/chat/conversations/:id**
Get conversation details with participant info.
```
Response: { conversation }
```

**POST /api/chat/conversations/:id/join**
Join a trip-group (add current user to participants).
```
Response: { conversation }
```
Add system message: "User joined the group"

**POST /api/chat/conversations/:id/leave**
Leave a group (remove current user from participants).
```
Response: { message: 'Left group' }
```
Add system message: "User left the group"

**DELETE /api/chat/conversations/:id**
Delete a 1:1 conversation (only creator or participant).

---

### Messages

**GET /api/chat/messages/:convId**
Get messages for a conversation (paginated).
```
Query params:
  ?limit=25          (default 25, max 50)
  ?before=<timestamp> (pagination cursor - get older messages)
  ?after=<timestamp>  (polling - get newer messages since last check)

Response: {
  messages: [{ _id, senderId, senderName, text, type, metadata, readBy, createdAt }],
  hasMore: true/false
}
```
When `after` param: `Message.find({ conversationId, createdAt: { $gt: after } }).sort({ createdAt: 1 })`
When `before` param: `Message.find({ conversationId, createdAt: { $lt: before } }).sort({ createdAt: -1 }).limit(25)`

**POST /api/chat/messages/:convId**
Send a message.
```
Body: {
  text: 'Hello!',
  type: 'text',          // 'text' | 'location' | 'trip-share'
  metadata: null,         // { lat, lng, name } for location, { tripId, destination } for trip-share
}
Response: { message }
```
Also updates `conversation.lastMessage` and `conversation.updatedAt`.

**POST /api/chat/messages/:convId/read**
Mark all messages in conversation as read by current user.
```
Response: { message: 'Marked as read' }
```
Updates `readBy` array on messages where `senderId !== userId` and `userId not in readBy`.

---

### Trip Groups

**GET /api/chat/trip-groups?destination=Tokyo**
Discover trip groups by destination.
```
Response: {
  groups: [
    { _id, name, destination, participantCount, lastMessage, createdAt }
  ]
}
```
Query: `Conversation.find({ type: 'trip-group', destination: regex(destination) })`

**POST /api/chat/trip-groups**
Create trip group (called after trip creation).
```
Body: {
  tripId: 'mongoTripId',
  destination: 'Tokyo',
  name: 'Trip to Tokyo - Apr 2026'
}
Response: { conversation }
```

---

### Unread

**GET /api/chat/unread**
Get total unread message count for badge.
```
Response: { totalUnread: 5 }
```

---

## Backend API Endpoints (`routes/users.js`)

**GET /api/users/search?q=john**
Search users by name or email (partial match).
```
Response: {
  users: [{ _id, name, email, avatar }]
}
```
Query: `User.find({ $or: [{ name: regex }, { email: regex }] }).limit(20)`
Exclude current user from results.

**POST /api/users/friends**
Send friend request.
```
Body: { friendId: 'mongoUserId' }
Response: { friend }
```

**GET /api/users/friends**
List all friends (accepted + pending).
```
Response: {
  friends: [{ _id, userId, friendId, status, friend: { name, email, avatar } }]
}
```

**PUT /api/users/friends/:id/accept**
Accept friend request.
```
Response: { friend }
```

**DELETE /api/users/friends/:id**
Remove friend / reject request.

---

## Register in `server.js`
```js
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');

app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
```

---

# FRONTEND

## New Service: `services/chatApi.js`
```js
export const chatAPI = {
  // Conversations
  getConversations: () => api.get('/chat/conversations'),
  createConversation: (data) => api.post('/chat/conversations', data),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  joinGroup: (id) => api.post(`/chat/conversations/${id}/join`),
  leaveGroup: (id) => api.post(`/chat/conversations/${id}/leave`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),

  // Messages
  getMessages: (convId, params) => api.get(`/chat/messages/${convId}`, { params }),
  sendMessage: (convId, data) => api.post(`/chat/messages/${convId}`, data),
  markRead: (convId) => api.post(`/chat/messages/${convId}/read`),

  // Trip groups
  discoverGroups: (destination) => api.get('/chat/trip-groups', { params: { destination } }),
  createTripGroup: (data) => api.post('/chat/trip-groups', data),

  // Unread
  getUnreadCount: () => api.get('/chat/unread'),
};

export const usersAPI = {
  search: (q) => api.get('/users/search', { params: { q } }),
  addFriend: (friendId) => api.post('/users/friends', { friendId }),
  getFriends: () => api.get('/users/friends'),
  acceptFriend: (id) => api.put(`/users/friends/${id}/accept`),
  removeFriend: (id) => api.delete(`/users/friends/${id}`),
};
```

---

## New Hook: `hooks/usePolling.js`
```js
// usePolling(fetchFn, intervalMs, enabled)
// - Calls fetchFn immediately, then every intervalMs
// - Stops when enabled=false or component unmounts
// - Returns { data, loading, error, refresh }

import { useState, useEffect, useRef, useCallback } from 'react';

export default function usePolling(fetchFn, intervalMs = 3000, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetch(); // immediate first call
      intervalRef.current = setInterval(fetch, intervalMs);
    }
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch, intervalMs, enabled]);

  return { data, loading, error, refresh: fetch };
}
```

---

## New Hook: `hooks/useNetworkStatus.js`
```js
import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected && state.isInternetReachable);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return isOnline;
}
```

---

# SCREEN WIREFRAMES

## 1. Chat List Screen (`app/(tabs)/chat.jsx`)
```
+----------------------------------+
|  Chats                    [+]    |  Title: headingXL, + icon top-right
|                                  |
|  [Search chats...]               |  Search input, 48px, border, icon
|                                  |
|  [Discover Trip Groups]          |  Teal pill button, secondary color
|                                  |
|  +------------------------------+
|  | [Avatar] John Doe        2m  |  ChatListItem component
|  |          Hey, are you co...  |  Last message preview, caption
|  |                         (3)  |  Unread badge, primary bg, white text
|  +------------------------------+
|  | [Avatar] Trip: Tokyo    1h   |  Trip group icon different
|  |          Sarah: Let's m...   |  Shows sender name for groups
|  +------------------------------+
|  | [Avatar] Travel Buddies  1d  |  Group chat
|  |          Alex: Check th...   |
|  +------------------------------+
|                                  |
|  --- No more chats ---           |  Empty state if no conversations
|  Start a conversation!           |
|                                  |
+------ Tab Bar -------------------+
```

**Component specs:**
- `SafeAreaView` + `FlatList` (not ScrollView, for performance with many chats)
- Search bar: `TextInput` with `Ionicons name="search"`, filters locally
- "Discover Trip Groups" button: `TouchableOpacity`, navigates to `app/chat/discover.jsx`
- "+" button: navigates to `app/chat/new.jsx`
- Polling: 3 second interval via `usePolling`, stops when screen unfocused
- Pull to refresh: `FlatList refreshControl`
- Bottom padding: 100px

---

## 2. ChatListItem Component (`components/chat/ChatListItem.jsx`)
```
+----------------------------------+
| [Avatar]  Name           Time    |
|    48px   Last message   Badge   |
+----------------------------------+

Props: { conversation, currentUserId, onPress }
```

**Layout:**
- Row: avatar (48x48 circle) | content (flex:1) | right column
- Avatar: `colors.primaryLight` background if no image, first letter of name
- Name: `fontSize: 16, fontWeight: '600'`, `colors.textPrimary`
- For groups: show group name. For 1:1: show other participant's name
- Last message: `fontSize: 14`, `colors.textSecondary`, numberOfLines=1
- For groups: prefix with "SenderName: " in lastMessage
- Time: `typography.caption`, `colors.textMuted`, relative ("2m", "1h", "3d")
- Unread badge: circular, `colors.primary` bg, white text, min-width 20px
- Card: no shadow, just bottom border `colors.border` 1px
- Active opacity: 0.7
- Height: ~72px

---

## 3. Conversation Screen (`app/chat/[id].jsx`)
```
+----------------------------------+
| [<] John Doe           [i] [...] |  Header: back, name, info, more
+----------------------------------+
|                                  |
|         System: Chat started     |  System message, centered, caption
|                                  |
|                    +----------+  |
|                    | Hello!   |  |  Sent bubble: right-aligned
|                    | 2:30 PM  |  |  Primary color bg, white text
|                    +----------+  |
|                                  |
|  +----------+                    |
|  | Hi there!|                    |  Received bubble: left-aligned
|  | 2:31 PM  |                    |  Card bg, textPrimary text
|  +----------+                    |
|                                  |
|                    +----------+  |
|                    | Check out|  |
|                    | this trip|  |  Trip share message
|                    | [Tokyo]  |  |  With tappable trip card
|                    | 2:35 PM  |  |
|                    +----------+  |
|                                  |
+----------------------------------+
| [+] Type a message...    [Send]  |  Input bar at bottom
+----------------------------------+
```

**Component specs:**
- Header: back button, conversation name (or participant name for 1:1), info icon (for groups)
- Messages: `FlatList` with `inverted={true}` (newest at bottom)
- Polling: 2 second interval for new messages via `?after=<lastMessageTimestamp>`
- Load older: on scroll to top, fetch `?before=<oldestMessageTimestamp>`
- Mark as read: call `markRead` when screen opens and on new messages
- Background: `colors.background`

**MessageBubble layout:**
- Sent: right-aligned, `colors.primary` bg, white text, borderRadius 16px (bottomRight: 4px)
- Received: left-aligned, `colors.card` bg, `colors.textPrimary` text, borderRadius 16px (bottomLeft: 4px)
- Max width: 75% of screen
- Padding: 12px horizontal, 8px vertical
- Timestamp: caption size, slightly transparent, below text
- System messages: centered, no bubble, `colors.textMuted`, italic

**MessageInput:**
- Fixed at bottom (inside SafeAreaView)
- Row: attachment button [+] | TextInput (flex:1, 44px height) | Send button
- Send button: `colors.primary` circle (40x40), send icon white
- Send disabled when text is empty (opacity 0.4)
- Attachment button opens action sheet: Share Location, Share Trip
- Background: `colors.card`, top border `colors.border`

---

## 4. New Chat Screen (`app/chat/new.jsx`)
```
+----------------------------------+
| [<] New Chat                     |
+----------------------------------+
|                                  |
|  [Search by name or email...]    |  Search input
|                                  |
|  [Create Group]                  |  Button -> new-group.jsx
|                                  |
|  Friends                         |  Section header
|  +------------------------------+
|  | [Avatar] John Doe     [Chat] |  Friend row with chat button
|  | [Avatar] Sarah Kim    [Chat] |
|  +------------------------------+
|                                  |
|  Search Results                  |  Shows when typing in search
|  +------------------------------+
|  | [Avatar] Alex Brown   [Add]  |  Not friends yet -> add button
|  | [Avatar] John Doe     [Chat] |  Already friends -> chat button
|  +------------------------------+
```

**Behavior:**
- Load friends list on mount
- Search triggers `usersAPI.search(q)` with 500ms debounce
- "Chat" button: check if 1:1 conversation exists, create if not, navigate to it
- "Add" button: send friend request, button changes to "Pending"
- "Create Group" navigates to `app/chat/new-group.jsx`

---

## 5. Create Group Screen (`app/chat/new-group.jsx`)
```
+----------------------------------+
| [<] New Group                    |
+----------------------------------+
|                                  |
|  Group Name                      |
|  [Enter group name...]           |  TextInput
|                                  |
|  Add Members                     |
|  [Search friends...]             |  Search input
|                                  |
|  Selected: (3)                   |
|  [John x] [Sarah x] [Alex x]    |  Chips with remove
|                                  |
|  Friends                         |
|  +------------------------------+
|  | [Avatar] John Doe      [+]   |  Toggle add/remove
|  | [Avatar] Sarah Kim      [+]  |
|  +------------------------------+
|                                  |
|  [Create Group]                  |  Primary button, full width
+----------------------------------+
```

---

## 6. Discover Trip Groups (`app/chat/discover.jsx`)
```
+----------------------------------+
| [<] Discover Groups              |
+----------------------------------+
|                                  |
|  Your Destinations               |  Based on user's trips
|  [Tokyo] [Bali] [Paris]          |  Tappable pills, filter groups
|                                  |
|  Groups for "Tokyo"              |
|  +------------------------------+
|  | Trip to Tokyo                 |  Group card
|  | 5 members                     |
|  | Apr 1 - Apr 8                 |
|  | Last: "Can't wait!" - 2h ago |
|  |                      [Join]   |
|  +------------------------------+
|  +------------------------------+
|  | Tokyo Explorers               |
|  | 12 members                    |
|  |                      [Join]   |
|  +------------------------------+
```

---

## 7. Offline Indicator (`components/chat/OfflineIndicator.jsx`)
```
+----------------------------------+
| [!] You're offline. Messages     |  Yellow/warning banner
|     will sync when connected.    |  At top of chat screens
+----------------------------------+
```
- Background: `colors.warning` with 15% opacity
- Text: `colors.warning`, fontSize 13
- Icon: `Ionicons name="cloud-offline"`
- Shows only when `useNetworkStatus()` returns false

---

# CHAT MANAGEMENT & SETTINGS

## Where Everything Lives

### In-App Navigation Map
```
Tab Bar: Home | Chat | History | Profile

Chat Tab (app/(tabs)/chat.jsx)
  |
  +-- Chat List (conversations)
  |     |-- [+] New Chat -> app/chat/new.jsx
  |     |     |-- Search users
  |     |     |-- Create Group -> app/chat/new-group.jsx
  |     |     +-- Discover Trip Groups -> app/chat/discover.jsx
  |     |
  |     +-- Tap conversation -> app/chat/[id].jsx (conversation)
  |           |-- [i] Info button (groups only) -> Group Info modal
  |           |     |-- Member list
  |           |     |-- Mute notifications toggle
  |           |     |-- Leave group
  |           |     +-- Share group link
  |           |
  |           |-- [...] More menu -> Chat Actions sheet
  |           |     |-- Search in chat
  |           |     |-- Shared media
  |           |     |-- Clear chat
  |           |     +-- Block user (1:1 only)
  |           |
  |           +-- Long press message -> Message Actions
  |                 |-- Copy text
  |                 |-- Reply
  |                 +-- Delete (own messages only)
  |
  +-- Nearby Users -> app/chat/nearby.jsx (Phase 5)

Profile Tab
  |
  +-- [Avatar] Tap to change photo -> Image Picker
  |     |-- Take Photo (Camera)
  |     |-- Choose from Gallery
  |     +-- Remove Photo
  |
  +-- Chat Settings (new row in settings card)
        |-- Online/Offline Mode toggle
        |-- Chat Notifications toggle
        +-- Clear All Chat Data
```

### Chat Settings in Profile
Add a new row in the Profile settings card:
```
+----------------------------------+
| Settings                         |
+----------------------------------+
| $ Default Currency          >    |
| Moon Dark Mode             [o]   |
| Bell Notifications         [o]   |
| Chat Chat Mode        [Online]   |  <-- NEW: Online/Offline toggle
| Share Export Trips           >   |
+----------------------------------+
```

The "Chat Mode" toggle switches between:
- **Online** (default): Polls server, sends via API
- **Offline**: Uses BLE P2P only, queues messages in SQLite

Stored in `SettingsContext` alongside darkMode and currency.

---

# PROFILE PHOTO CHANGE

## How It Works

### Package Required
```bash
npx expo install expo-image-picker expo-image-manipulator
```
Works in Expo Go - no dev build needed.

### Image Storage: Base64 in MongoDB
- User picks/takes photo -> resize to 150x150 + compress to JPEG 50% quality on device
- Convert to base64 string -> send to backend
- Store base64 directly in MongoDB User.avatar field
- No Firebase Storage needed - simpler, fewer dependencies

**Why this works:**
- 150x150 JPEG at 50% quality = ~5-15KB base64 string
- MongoDB document limit is 16MB - avatar is tiny fraction
- No external storage service to manage
- Faster to display (no network fetch for image)

---

# USERNAME SYSTEM

## How It Works

### Auto-Generate on Signup
When user creates account, auto-generate username:
```
Format: {firstName}{random4digits}
Example: eka4827, sarah9031, john1456
```

### Rules
- Lowercase, no spaces
- 3-20 characters
- Only letters, numbers, underscores
- Must be unique in database
- Auto-generated on first login (via `/api/auth/verify`)

### Backend Changes

**Modify User model (`models/User.js`):**
```js
// Add to schema:
username: {
  type: String,
  unique: true,
  sparse: true,      // allows null initially
  lowercase: true,
  trim: true,
  minlength: 3,
  maxlength: 20,
  match: /^[a-z0-9_]+$/,   // only lowercase, numbers, underscore
  index: true,
},
```

**Auto-generate in `routes/auth.js` (verify endpoint):**
```js
// When creating new user:
function generateUsername(name) {
  const base = (name || 'user').toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  const random = Math.floor(1000 + Math.random() * 9000); // 4 random digits
  return `${base}${random}`;
}

// In POST /api/auth/verify, when !user:
let username = generateUsername(name);
// Check uniqueness, retry if taken (max 5 attempts)
for (let i = 0; i < 5; i++) {
  const exists = await User.findOne({ username });
  if (!exists) break;
  username = generateUsername(name);
}
user = await User.create({ ..., username });
```

**New endpoint in `routes/users.js`:**
```
PUT /api/users/username
Body: { username: 'eka_travels' }
Response: { user }
Errors:
  400 - "Username must be 3-20 chars, lowercase letters/numbers/underscores only"
  409 - "Username already taken"
```

**New endpoint:**
```
GET /api/users/check-username?username=eka_travels
Response: { available: true/false }
```
Used for real-time availability check while typing.

### Frontend Changes

**Profile screen shows username:**
```
+----------------------------------+
|     [Avatar]                     |
|     Eka Kumar                    |  name (bold)
|     @eka4827                     |  username (secondary color)
|     eka@gmail.com                |  email (muted)
+----------------------------------+
```

**Tap username to edit:**
Opens SwipeableBottomSheet:
```
+----------------------------------+
|  Change Username                 |
|                                  |
|  @[eka_travels          ]        |  TextInput with @ prefix
|                                  |
|  [check] Available!              |  Green check when available
|  [x] Already taken               |  Red x when taken
|                                  |
|  - 3-20 characters               |  Rules text, caption
|  - Lowercase letters, numbers, _ |
|                                  |
|  [Save Username]                 |  Primary button
+----------------------------------+
```

**Real-time check:** Debounce 500ms, call `GET /api/users/check-username?username=X` as user types.

### Chat Display

**In ChatListItem:** Show `@username` under the name
```
+----------------------------------+
| [Avatar]  John Doe          2m   |
|           @john4827              |  Username in caption/muted
|           Hey, are you co...     |
+----------------------------------+
```

**In MessageBubble (groups only):** Show `@username` above received messages
```
|  @sarah9031                      |  Username label, caption size
|  +----------+                    |
|  | Hi there!|                    |
|  | 2:31 PM  |                    |
|  +----------+                    |
```

**In New Chat / Search:** Results show name + username
```
| [Avatar] John Doe                |
|          @john4827               |  Helps distinguish same-name users
|                          [Chat]  |
```

### Files to Modify
```
Backend:
  models/User.js          (MODIFY - add username field)
  routes/auth.js          (MODIFY - auto-generate username on signup)
  routes/users.js         (MODIFY - add username change + check endpoints)

Frontend:
  app/(tabs)/profile.jsx  (MODIFY - show @username, tap to edit)
  context/AuthContext.jsx  (MODIFY - include username in user object)
  components/chat/ChatListItem.jsx    (show @username)
  components/chat/MessageBubble.jsx   (show @username for groups)
  app/chat/new.jsx                    (show @username in search results)
```

---

### Backend Changes (Profile Photo)

**Modify User model (`models/User.js`):**
`avatar` field already exists as String - base64 string fits fine.
Add body size limit for this endpoint: 1MB (more than enough).

**New endpoint in `routes/users.js`:**
```
PUT /api/users/profile-photo
Body: { avatar: 'data:image/jpeg;base64,/9j/4AAQ...' }
Response: { user }
```
Validation: Check base64 string < 500KB, starts with `data:image/`.

**New endpoint:**
```
DELETE /api/users/profile-photo
Response: { user }  // avatar set to ''
```

### Frontend Changes

**Updated Profile Screen (`app/(tabs)/profile.jsx`):**
```
+----------------------------------+
|                                  |
|     +--------+                   |
|     | [Photo]|  <-- Tappable     |
|     |  [cam] |  Camera icon      |
|     +--------+  overlay          |
|     Eka Kumar                    |
|     eka@gmail.com                |
+----------------------------------+
```

**Tap avatar -> Action Sheet (3 options):**
```
+----------------------------------+
|  Change Profile Photo            |
|                                  |
|  [Camera] Take Photo             |  Opens camera
|  [Image]  Choose from Gallery    |  Opens photo library
|  [Trash]  Remove Photo           |  Red text, removes avatar
|                                  |
|  [Cancel]                        |
+----------------------------------+
```

**Flow:**
1. User taps avatar
2. Action sheet appears (SwipeableBottomSheet)
3. "Take Photo" -> `ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.5 })`
4. "Choose from Gallery" -> `ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.5 })`
5. Image returned -> resize to 150x150 via `expo-image-manipulator`
6. Read as base64 -> `FileSystem.readAsStringAsync(uri, { encoding: 'base64' })`
7. Prepend `data:image/jpeg;base64,` prefix
8. PUT /api/users/profile-photo with base64 string
9. Update AuthContext user.avatar
10. "Remove Photo" -> DELETE /api/users/profile-photo -> set avatar to ''

### Helper: Convert Image to Base64 (in profile.jsx)
```js
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

async function pickAndConvert(source) {
  const pickerFn = source === 'camera'
    ? ImagePicker.launchCameraAsync
    : ImagePicker.launchImageLibraryAsync;

  const result = await pickerFn({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
  });

  if (result.canceled) return null;

  // Resize to 150x150
  const resized = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 150, height: 150 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Convert to base64
  const base64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:image/jpeg;base64,${base64}`;
}
```

### Files to Modify
```
Frontend:
  app/(tabs)/profile.jsx          (MODIFY - add avatar tap, photo picker, base64 convert)
  context/AuthContext.jsx          (MODIFY - add updateAvatar function)

Backend:
  routes/users.js                 (MODIFY - add profile-photo PUT/DELETE endpoints)

Dependencies:
  npx expo install expo-image-picker expo-image-manipulator
  (expo-file-system already included with Expo)
```

### No Firebase Storage Needed
Everything stored directly in MongoDB. Simple, no extra services.

---

# ONLINE/OFFLINE MODE TOGGLE

## How It Works

### In SettingsContext
Add new state alongside darkMode and currency:
```js
const [chatMode, setChatMode] = useState('online');  // 'online' | 'offline'
```

### Toggle in Profile Settings
```
| Chat Chat Mode        [Online]   |
```
- `Switch` component, same style as Dark Mode toggle
- When switched to Offline:
  - Polling stops (no API calls for chat)
  - Messages saved to SQLite only
  - BLE advertising starts (if Phase 5 done)
  - Yellow banner shows on chat screens: "Offline Mode - BLE only"
- When switched back to Online:
  - Queued messages sync to server
  - Polling resumes
  - BLE advertising stops

### Toggle on Chat List Header
Also add a quick toggle on the chat list screen header:
```
+----------------------------------+
| Chats  [cloud/cloud-off]  [+]   |  Cloud icon toggles online/offline
+----------------------------------+
```
- `Ionicons name="cloud"` when online (colors.success green)
- `Ionicons name="cloud-offline"` when offline (colors.warning amber)
- Tap toggles mode (same as profile toggle)

### How Chat Screens Behave per Mode

| Feature | Online Mode | Offline Mode |
|---------|-------------|--------------|
| Polling | Every 2-3s | Disabled |
| Send message | POST to API | Save to SQLite |
| New messages | From polling | From BLE only |
| Chat list | From API | From SQLite cache |
| Search users | Works | Disabled (show "Go online to search") |
| Create group | Works | Disabled |
| Discover groups | Works | Disabled |
| Nearby users | Hidden | Visible + active |
| Indicator | Green cloud icon | Yellow banner |

### SettingsContext Changes
```js
// Add to SettingsContext.jsx
const [chatMode, setChatMode] = useState('online');

const toggleChatMode = () => {
  const newMode = chatMode === 'online' ? 'offline' : 'online';
  setChatMode(newMode);
  saveSettings({ darkMode, currency, chatMode: newMode });
};

// Export in provider value:
value={{ ..., chatMode, toggleChatMode }}
```

### Files to Modify
```
context/SettingsContext.jsx    (MODIFY - add chatMode state)
app/(tabs)/profile.jsx        (MODIFY - add Chat Mode toggle row)
app/(tabs)/chat.jsx           (MODIFY - add cloud icon toggle in header)
app/chat/[id].jsx             (MODIFY - check chatMode for polling vs SQLite)
hooks/usePolling.js           (MODIFY - accept enabled param from chatMode)
```

---

# OFFLINE QUEUE (Phase 3)

## SQLite Schema (`services/offlineChat.js`)
```sql
CREATE TABLE IF NOT EXISTS offline_messages (
  id TEXT PRIMARY KEY,           -- UUID generated on device
  conversationId TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  metadata TEXT,                 -- JSON string
  createdAt INTEGER NOT NULL,    -- Unix timestamp ms
  synced INTEGER DEFAULT 0       -- 0 = pending, 1 = synced
);

CREATE TABLE IF NOT EXISTS offline_conversations (
  id TEXT PRIMARY KEY,           -- MongoDB _id
  data TEXT NOT NULL,            -- Full conversation JSON
  updatedAt INTEGER NOT NULL
);
```

**Sync flow:**
1. User sends message while offline -> save to `offline_messages` with `synced=0`
2. Show message immediately in UI (optimistic)
3. `useNetworkStatus()` detects online
4. Batch POST all `synced=0` messages to backend
5. On success, update `synced=1`
6. Pull latest messages from server

---

# P2P BLUETOOTH (Phase 5)

## `services/bleChat.js`

**Discovery:**
- Advertise as BLE peripheral with custom service UUID
- Service UUID: `'6E400001-B5A3-F393-E0A9-E50E24DCCA9E'` (UART service)
- Advertise user name + userId in advertisement data

**Message protocol:**
```json
{
  "v": 1,
  "type": "msg",
  "id": "uuid",
  "from": { "id": "firebaseUid", "name": "John" },
  "text": "Hello from the mountain!",
  "ts": 1711900000000,
  "sig": "hmac-sha256"
}
```

**BLE data transfer:**
- Max MTU: ~512 bytes after negotiation
- Messages > 512 bytes: chunk into 500-byte packets with sequence numbers
- Reassemble on receiving side

**Nearby Users screen:**
```
+----------------------------------+
| [<] Nearby Users                 |
+----------------------------------+
|                                  |
|  [Scanning...]                   |  Animated radar icon
|                                  |
|  Found 2 travelers nearby        |
|  +------------------------------+
|  | [BLE] John Doe      [Chat]   |  BLE icon instead of avatar
|  |       ~30m away               |  RSSI-based distance estimate
|  +------------------------------+
|  | [BLE] Sarah Kim     [Chat]   |
|  |       ~80m away               |
|  +------------------------------+
|                                  |
|  Range: ~100m via Bluetooth      |  Info text
|  Messages sync when online       |
+----------------------------------+
```

---

# FILE STRUCTURE SUMMARY

## Backend (new files only)
```
TripCraft-backend/
  models/
    Conversation.js       (NEW)
    Message.js            (NEW)
    Friend.js             (NEW)
  routes/
    chat.js               (NEW - all chat endpoints)
    users.js              (NEW - search, friends, profile photo)
  server.js               (MODIFY - add 2 route registrations)
```

## Frontend (new files only)
```
TripCraft/
  app/
    (tabs)/
      _layout.jsx          (MODIFY - replace Map with Chat tab)
      chat.jsx             (NEW - chat list screen)
      profile.jsx          (MODIFY - avatar picker, chat mode toggle)
    chat/
      [id].jsx             (NEW - conversation screen)
      new.jsx              (NEW - new chat / search users)
      new-group.jsx        (NEW - create group)
      discover.jsx         (NEW - discover trip groups)
      nearby.jsx           (NEW - BLE nearby users, Phase 5)
  components/
    chat/
      ChatListItem.jsx     (NEW)
      MessageBubble.jsx    (NEW)
      MessageInput.jsx     (NEW)
      OfflineIndicator.jsx (NEW)
  services/
    chatApi.js             (NEW - API functions)
    # No storage.js needed - base64 goes directly to MongoDB via API
    offlineChat.js         (NEW - SQLite queue, Phase 3)
    bleChat.js             (NEW - BLE P2P, Phase 5)
  hooks/
    usePolling.js          (NEW)
    useNetworkStatus.js    (NEW)
  context/
    AuthContext.jsx         (MODIFY - add updateAvatar function)
    SettingsContext.jsx     (MODIFY - add chatMode state + toggle)
  app/new-trip.jsx         (MODIFY - auto-create trip group after trip creation)
```

## New Dependencies
```bash
npx expo install expo-image-picker expo-sqlite expo-network expo-notifications
npm install react-native-ble-plx --legacy-peer-deps   # Phase 5 only
```

---

# IMPLEMENTATION ORDER

## Phase 0: Username + Profile Photo + Chat Mode Toggle (do first, independent of chat)
```
1.  Backend: models/User.js (add username field with unique index)
2.  Backend: routes/auth.js (auto-generate username on signup)
3.  Backend: routes/users.js (username change, check-username, profile-photo endpoints)
4.  Install expo-image-picker, expo-image-manipulator
5.  Frontend: AuthContext.jsx (add username to user object, add updateAvatar)
6.  Frontend: profile.jsx (show @username, tap to edit, avatar tap -> photo picker)
7.  Frontend: SettingsContext.jsx (add chatMode state + toggleChatMode)
8.  Frontend: profile.jsx (add Chat Mode toggle row in settings)
```
No Firebase Storage needed - base64 in MongoDB. Username auto-generated on first login.
```

## Phase 1: Online 1:1 Chat
```
9.  Backend: models/Conversation.js, models/Message.js
10. Backend: routes/chat.js (conversations + messages endpoints)
11. Backend: routes/users.js (add search endpoint)
12. Backend: server.js (register chat + users routes)
13. Frontend: services/chatApi.js
14. Frontend: hooks/usePolling.js
15. Frontend: app/(tabs)/_layout.jsx (replace Map -> Chat tab)
16. Frontend: components/chat/ChatListItem.jsx
17. Frontend: components/chat/MessageBubble.jsx
18. Frontend: components/chat/MessageInput.jsx
19. Frontend: app/(tabs)/chat.jsx (chat list with cloud toggle)
20. Frontend: app/chat/[id].jsx (conversation screen)
21. Frontend: app/chat/new.jsx (new chat + user search)
```

## Phase 2: Groups + Trip Groups + Friends
```
22. Backend: models/Friend.js
23. Backend: routes/chat.js (add group, join, leave, trip-group endpoints)
24. Backend: routes/users.js (add friends CRUD)
25. Frontend: app/chat/new-group.jsx
26. Frontend: app/chat/discover.jsx
27. Frontend: app/new-trip.jsx (add trip-group auto-creation)
28. Frontend: Group info modal (members, leave)
```

## Phase 3: Offline Queue + Mode Toggle Integration
```
29. Install expo-sqlite, expo-network
30. Frontend: services/offlineChat.js (SQLite tables + CRUD)
31. Frontend: hooks/useNetworkStatus.js
32. Frontend: components/chat/OfflineIndicator.jsx
33. Frontend: Integrate chatMode toggle into chat screens
    - Online: polling + API
    - Offline: SQLite + BLE
34. Frontend: Sync queue on mode switch (offline -> online)
```

## Phase 4: Push Notifications
```
35. Install expo-notifications
36. Backend: Add fcmToken to User model
37. Backend: Send FCM via Firebase Admin on new message
38. Frontend: Register token on login
39. Frontend: Handle notification tap -> navigate to conversation
```

## Phase 5: P2P Bluetooth
```
40. Install react-native-ble-plx (requires dev build)
41. Frontend: services/bleChat.js
42. Frontend: app/chat/nearby.jsx
43. Frontend: BLE message storage in SQLite
44. Frontend: Auto-sync BLE messages when online
45. Frontend: Show "Nearby Users" option when chatMode = 'offline'
```

---

# VERIFICATION CHECKLIST

### Username
- [ ] New user signup -> username auto-generated (e.g. @eka4827)
- [ ] Username shown in profile under name
- [ ] Tap username -> edit sheet with real-time availability check
- [ ] Cannot save duplicate username (409 error)
- [ ] Username validation: 3-20 chars, lowercase, letters/numbers/underscores
- [ ] Username shows in chat list items (@username under name)
- [ ] Username shows above received messages in group chats
- [ ] Search results show name + @username

### Profile Photo
- [ ] Tap avatar in profile -> action sheet appears
- [ ] "Take Photo" opens camera, allows crop to square
- [ ] "Choose from Gallery" opens photo library, allows crop
- [ ] Photo uploads to Firebase Storage -> URL saved to MongoDB
- [ ] Avatar updates immediately in profile + chat messages
- [ ] "Remove Photo" deletes from storage, resets to default icon
- [ ] Works in dark mode

### Chat Mode Toggle
- [ ] Toggle in Profile settings switches between Online/Offline
- [ ] Cloud icon in chat list header reflects current mode
- [ ] Online mode: polling active, API calls work
- [ ] Offline mode: polling stops, messages go to SQLite
- [ ] Switching offline -> online triggers sync of queued messages
- [ ] State persists across app restarts

### Chat (Online)
- [ ] Chat tab shows in tab bar with badge for unread count
- [ ] Chat list loads conversations sorted by recent
- [ ] Search filters conversations locally
- [ ] Create 1:1 chat -> navigates to conversation
- [ ] Send text message -> appears in 2-3 seconds on other device
- [ ] Message bubbles: sent (right, orange), received (left, white/dark)
- [ ] System messages centered and styled differently
- [ ] Load older messages on scroll to top
- [ ] Unread badge updates correctly
- [ ] Long press message -> copy/reply/delete actions

### Groups & Trip Groups
- [ ] Create group -> add members -> group appears in chat list
- [ ] Trip group auto-created when trip is created
- [ ] Discover trip groups by destination -> join -> see messages
- [ ] Leave group -> removed from participants
- [ ] Group info shows member list

### Friends
- [ ] Search users -> add friend -> friend request sent
- [ ] Accept friend request -> appears in friends list
- [ ] Friends show in "New Chat" screen

### Offline & BLE
- [ ] Offline: type message -> shows locally -> syncs when online
- [ ] Offline indicator banner shows when in offline mode
- [ ] BLE: discover nearby users -> send P2P message
- [ ] BLE messages stored locally, sync when online

### Notifications
- [ ] Push notification received when app in background
- [ ] Tap notification -> navigates to conversation

### Responsiveness
- [ ] Dark mode: all chat screens + modals work correctly
- [ ] Polling stops when screens are not focused (battery safe)
- [ ] Polling interval: 3s on chat list, 2s inside conversation
- [ ] Bottom padding clears tab bar on all devices
- [ ] Keyboard doesn't cover input on iOS
- [ ] Action sheets use SwipeableBottomSheet (swipe to dismiss)

---

# AUDIT FIXES & CLARIFICATIONS

## Fix 1: Profile Photo Checklist (was referencing Firebase Storage)
Corrected: Photo saved as base64 to MongoDB. No Firebase Storage.
Validation: base64 string < 100KB (150x150 JPEG at 50% = ~5-15KB, 100KB is safe upper bound).

## Fix 2: 1:1 Conversation "Other Participant" Logic
When listing conversations:
```js
// In ChatListItem, determine display name for 1:1:
const otherParticipant = conversation.participants.find(p => 
  p.userId.toString() !== currentUserId.toString()
);
const displayName = conversation.type === '1:1' 
  ? otherParticipant?.name 
  : conversation.name;
```
When creating 1:1, check existing:
```js
// Backend: find existing 1:1 between these 2 users
const existing = await Conversation.findOne({
  type: '1:1',
  'participants.userId': { $all: [userId1, userId2] },
  $expr: { $eq: [{ $size: '$participants' }, 2] }
});
if (existing) return existing; // don't create duplicate
```

## Fix 3: Message Type & Metadata Spec
| type | text | metadata |
|------|------|----------|
| text | "Hello!" | null |
| location | "Shared a location" | `{ lat: 28.6, lng: 77.2, name: "Delhi" }` |
| trip-share | "Shared a trip" | `{ tripId: "abc123", destination: "Tokyo" }` |
| system | "John joined the group" | null |

System messages: `senderId` = null, `senderName` = "System".

## Fix 4: Group Permissions
- **Creator** can: rename group, remove members, delete group
- **Any member** can: leave group, send messages, add new members
- **Last member** leaving: group auto-deleted (cascade delete messages)
- Store `createdBy` on Conversation to check creator permissions

## Fix 5: Offline Mode - Disabled Features
When chatMode = 'offline':
- "New Chat" button: shows toast "Go online to start new chats"
- "Create Group" button: disabled with gray color
- "Discover Groups" button: disabled
- "Search users" field: disabled, placeholder says "Go online to search"
- Only "Nearby Users" (BLE) is active for new connections
- Existing conversations show cached messages from SQLite

## Fix 6: Missing Endpoints (add to routes/chat.js)
```
DELETE /api/chat/messages/:msgId           — Delete own message only
POST   /api/chat/conversations/:id/clear   — Clear chat history for current user
POST   /api/chat/conversations/:id/block   — Block user in 1:1 (hide conversation)
GET    /api/chat/messages/:convId/search?q= — Search messages in conversation
```

## Fix 7: Username Stored Without @
- DB stores: `"eka4827"` (no @ symbol)
- Display adds @: `@${user.username}`
- Search by username: `GET /api/users/search?q=eka` matches both name AND username
- Friend model response includes username via populate:
```js
Friend.find({ userId }).populate('friendId', 'name email avatar username')
```

## Fix 8: Avatar Staleness in Conversations
Don't store avatar in `conversation.participants`. Instead:
- Store only `{ userId, joinedAt }` in participants array
- Populate user data (name, avatar, username) on read:
```js
// In GET /conversations, populate participant details:
const conversations = await Conversation.find(...)
  .populate('participants.userId', 'name avatar username');
```
This ensures avatars are always current.

**Updated Conversation participants schema:**
```js
participants: [{
  userId: { type: ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
}],
```
`name`, `avatar`, `username` fetched via populate, not stored.

## Fix 9: BLE User ID
BLE advertisement uses **Firebase UID** (string) because:
- Available on the device without backend
- Matches `req.user.uid` for syncing later
- MongoDB ObjectId requires a backend lookup

## Fix 10: Polling Intervals (standardized)
- Chat list screen: **3 seconds**
- Inside conversation: **2 seconds**
- Unread badge (tab bar): **10 seconds** (lightweight, just a count)
- All polling stops when screen loses focus

## Fix 11: Missing Wireframes

### Group Info Modal
```
+----------------------------------+
|  Trip to Tokyo                   |  Group name, editable by creator
|  5 members                       |
|                                  |
|  Members                         |
|  +------------------------------+
|  | [Av] John @john4827  Creator |
|  | [Av] Sarah @sarah90  [x]    |  Creator can remove
|  | [Av] Alex @alex1234  [x]    |
|  +------------------------------+
|                                  |
|  [Mute Notifications]    [off]   |  Toggle
|  [Leave Group]                   |  Red text
+----------------------------------+
```

### Message Long Press Actions
```
+----------------------------------+
|  Copy Text                       |
|  Reply                           |  Prefills input with quote
|  Delete                          |  Red, own messages only
|  Cancel                          |
+----------------------------------+
```

### Chat Actions Sheet (header [...] menu)
```
+----------------------------------+
|  Search in Chat                  |
|  Mute Notifications              |
|  Clear Chat                      |
|  Block User                      |  1:1 only, red text
|  Cancel                          |
+----------------------------------+
```

## Fix 12: Default Avatar
- Show first letter of **display name** (not username)
- Background: `colors.primaryLight`
- Letter: `colors.primary`, fontSize 20, fontWeight '700'
- If name empty: show generic person icon (Ionicons "person")

## Fix 13: Phase 4 Frontend Files (was missing)
```
Phase 4 new files:
  services/notifications.js     (NEW - register token, handle taps)
  
Phase 4 modified files:
  context/AuthContext.jsx       (MODIFY - register FCM token on login)
  app/_layout.jsx               (MODIFY - notification listener at root)
```

## Fix 14: Empty States
- **Chat list empty**: Illustration + "No conversations yet" + "Start chatting!" CTA
- **Search no results**: "No users found" text
- **No friends**: "Add friends to start chatting" + search bar
- **No trip groups**: "No groups for this destination yet" + "Create one" button
- **Failed message**: Red retry icon on message bubble, tap to retry

## Fix 15: Rate Limiting (backend middleware)
- Message sending: max 30 messages/minute per user
- Friend requests: max 20/hour per user
- Group creation: max 10/hour per user
- Search: max 60 requests/minute per user
- Simple in-memory counter, reset on window expiry
