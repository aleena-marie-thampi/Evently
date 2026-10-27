# Evently — Interactive Event Management & Ticketing System

Full-stack app: HTML/CSS/JS frontend, Node.js + Express REST API, MongoDB + Mongoose,
JWT auth, bcrypt, QR tickets (qrcode), Chart.js analytics, Multer image uploads, dotenv.

## Run it
1. Install Node.js 18+ and MongoDB (local, or use a MongoDB Atlas URI).
2. `npm install`
3. Edit `.env` (set a long random `JWT_SECRET`; change `MONGO_URI` if not local).
4. Optional demo data: `npm run seed`
   (organizer@demo.com / demo123, attendee@demo.com / demo123)
5. `npm start` and open http://localhost:5000

## Structure
```
server.js            Express app + MongoDB connection
models/              User, Event, Registration, Notification (Mongoose schemas)
routes/              auth, events, registrations, notifications (REST APIs)
middleware/          auth.js (JWT + roles), upload.js (Multer)
public/              HTML pages (+ organizer/ pages), css/style.css, js/common.js, js/pages.js
uploads/             event images
seed.js              demo data
```

## API summary
| Method | Endpoint | Who |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET/PUT | /api/auth/me | logged in |
| GET | /api/events?search=&category=&date=today\|week\|month&location=&availability=available&sort=upcoming\|newest\|popular&limit= | public |
| GET | /api/events/meta (categories + locations), /api/stats (live home counts) | public |
| GET | /api/events/:id/analytics | organizer (owner) |
| PUT | /api/auth/password | logged in |
| GET | /api/events/:id | public |
| POST/PUT/DELETE | /api/events, /api/events/:id (DELETE = cancel) | organizer (owner) |
| GET | /api/events/mine, /api/events/stats/organizer | organizer |
| GET / PATCH | /api/events/:id/attendees, .../:regId/checkin | organizer (owner) |
| POST | /api/registrations {eventId} | attendee |
| GET | /api/registrations/mine, /api/registrations/:id/ticket | attendee |
| DELETE | /api/registrations/:id (cancel) | attendee |
| GET/POST | /api/notifications, /unread-count, /read-all | logged in |

## Overbooking protection
Registration uses one atomic MongoDB update (`registered < capacity` → `$inc`), so two
simultaneous requests for the last seat cannot both succeed. If ticket creation fails, the seat is rolled back.

## Database design
- **User**: name, email (unique), password (bcrypt hash), role, phone
- **Event** (status: draft / published / cancelled; 'completed' is derived from the date): title, description, category, image, date, startTime, endTime, venue, address, location, capacity, registered, deadline, status, organizer (ref)
- **Registration**: user (ref), event (ref), ticketId (unique), status, checkedIn — unique index on (user, event)
- **Notification**: user (ref), message, type, read

The optional Admin panel is not included (the `admin` role exists in the User model for future use).
