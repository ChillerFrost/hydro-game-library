# Hydro — Game Library API

Node.js + Express + Mongoose + MongoDB Atlas. Users build a library of games from a fixed store catalogue; the frontend in `public/` consumes the REST API.

The catalogue (100 games) is hard-coded in `data/games.js`. On every startup the `games` collection is synced to that list by title: new games are added, changed fields are updated, and games no longer in the list are removed along with their library entries. To change the store, edit `data/games.js` and restart.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your Atlas connection string (allow your IP in Atlas Network Access).
3. `npm start` → http://localhost:3000

Data persists in Atlas: stop and restart the server and users, games, and libraries remain.

## Data models
| Model | Fields |
|---|---|
| **User** | `username` (unique, 3–30), `email` (unique, valid format) |
| **Game** | `title` (unique), `developer`, `genre`, `releaseYear` (1970–2100, optional) |
| **LibraryEntry** | `user` → User, `game` → Game, `installed`, `favorite`, `hoursPlayed` (≥ 0); unique per (user, game) |

Relationships: User 1—N LibraryEntry N—1 Game (many-to-many via LibraryEntry). Deleting a user cascades to their entries.

## API routes
| Method | Route | Description | Success |
|---|---|---|---|
| POST | `/api/auth/register` | Create account `{username,email,password}` (password ≥ 8) | 201 |
| POST | `/api/auth/login` | Sign in `{email,password}` | 200 / 401 |
| POST | `/api/users` | Create user `{username,email}` | 201 |
| GET | `/api/users` | List users | 200 |
| DELETE | `/api/users/:id` | Delete user + their library | 204 |
| GET | `/api/games?genre=&q=` | List/filter/search games | 200 |
| GET | `/api/games/:id` | Get one game | 200 |
| POST | `/api/library` | Add game to library `{user,game}` | 201 |
| GET | `/api/library/user/:userId?favorite=&installed=` | User's library (games populated) | 200 |
| PATCH | `/api/library/:id` | Update `installed`/`favorite`/`hoursPlayed` | 200 |
| DELETE | `/api/library/:id` | Remove from library | 204 |

## Errors
`400` validation / invalid id / bad JSON · `404` not found · `401` wrong email/password · `409` duplicate (username, email, title, or game already in library) · `500` unexpected. Body: `{ "error": "message" }`.
