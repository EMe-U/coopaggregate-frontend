# CoopAggregate – Frontend

CoopAggregate is a system for Koperative Intagamburuzwa, an Irish-potato
cooperative in Busogo, Musanze, Rwanda. It has two parts: a manager app
(login required) where the cooperative manager records deliveries, manages
members, lots, sales and payments, and public buyer pages (no login) where
buyers can see available stock and send purchase requests. This repository
contains the frontend. All data comes from a separate Spring Boot REST API.

## Links

- Live app: https://coopaggregate-frontend.onrender.com
- Backend repository: https://github.com/EMe-U/coopaggregate-backend
- Figma designs: https://www.figma.com/design/Xzp3pqB8GGrTBIW6leDQkh/coopagregate?node-id=0-1&t=crHfOMSkCjKROOhn-1
- Video demo: Coming soon

## Tech stack

- React with Vite
- React Router
- Tailwind CSS v4
- axios
- react-i18next (Kinyarwanda by default, English)
- idb for offline storage (coming soon)
- lucide-react for icons
- Render Static Site for hosting

## Design

The screens follow the Figma designs linked above.

The style guide colors are defined as Tailwind theme tokens in the `@theme`
block of `src/index.css`:

| Token           | Value     | Use                                |
| --------------- | --------- | ---------------------------------- |
| `primary`       | `#14532D` | Active menu item, main buttons     |
| `primary-light` | `#DCFCE7` | Success badges, banners            |
| `danger`        | `#DC2626` | Errors, destructive actions        |
| `warning`       | `#F59E0B` | Warnings                           |
| `background`    | `#F5F7F6` | Page background                    |
| `surface`       | `#FFFFFF` | Cards                              |
| `text`          | `#111827` | Main text                          |
| `muted`         | `#6B7280` | Secondary text                     |

The font is Inter, loaded from Google Fonts in `index.html`.

Screenshots: see `docs/screenshots/`.

## Project structure

```
src/
  api/          axios client and API calls
  components/   layouts, sidebar, top bar, shared components
  hooks/        custom React hooks
  i18n/         i18next setup and translation files (en.json, rw.json)
  offline/      offline storage with IndexedDB (coming soon)
  pages/
    manager/    manager app pages
    public/     public buyer pages
  utils/        small helpers (auth token storage)
  App.jsx       routes
  main.jsx      entry point
  index.css     Tailwind import and theme
```

## Getting started

Prerequisites: Node.js 20.19 or newer and npm.

```
git clone https://github.com/EMe-U/coopaggregate-frontend.git
cd coopaggregate-frontend
npm install
```

Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend URL, for
example:

```
VITE_API_URL=http://localhost:8081
```

Start the development server:

```
npm run dev
```

Open http://localhost:5173.

The backend must be running at `VITE_API_URL` for data to load. The Dashboard
shows "Backend connected" or "Backend not reachable" based on a call to
`GET /api/health`.

## Features

Working now:

- Manager layout with a sidebar and top bar
- Navigation between all manager pages, with the current page highlighted
- Responsive sidebar: hidden under 768px and opened with a menu button
- EN / RW language switch, saved in the browser
- Online / Offline badge in the top bar
- Backend connection check on the Dashboard
- Protected manager routes (redirect to `/login` without a token) and logout
- Public layout for buyer pages

Coming soon:

- Login
- Dashboard
- Record Delivery
- Members and Member Details
- Lots & Stock
- Sales
- Share Lot Money
- Payments
- Buyer Requests
- Ledger
- Settings
- Disputes
- Reports
- Public pages: available stock, Send Request, Check Request Status
- Offline mode

## Deployment

The app is deployed as a Render Static Site with these settings:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL` set to the backend URL. Vite reads
  this at build time, so a redeploy is needed after changing it.
- Redirects/Rewrites: source `/*`, destination `/index.html`, action
  `Rewrite`. This lets page refreshes and direct links work with client-side
  routing.
- Auto-deploy from the `main` branch.

## Author

Emerance Umurerwa – BSc Software Engineering, African Leadership University.

Supervisor: Bernard Lamptey.
