# CoopAggregate – Frontend

CoopAggregate is the manager web app and public buyer page for Koperative Intagamburuzwa, an
Irish-potato cooperative in Busogo, Musanze, Rwanda. Without it, the cooperative keeps deliveries,
stock, sales and payments to farmers on paper. That makes it hard to know how much potato is in
stock, which farmer's potatoes were sold, and what each farmer is owed. The cooperative manager
uses the manager app (login required) to record deliveries from farmers, group them into lots,
record sales to buyers and pay each farmer their share. Buyers use the public pages (no login) to
see available stock, send a purchase request and check its status. This repository holds the
frontend. All data comes from a separate Spring Boot REST API (the backend repository below).

## Links

- Live app: https://coopaggregate-frontend.onrender.com
- Backend repository: https://github.com/EMe-U/coopaggregate-backend
- Walkthrough video: https://drive.google.com/file/d/1No90uH3VIGJ2lxM5fEgdKKYCzFpFetwZ/view?usp=sharing
- Technical report: https://docs.google.com/document/d/1bGd_vEHIhrF_s2BjH-lA2hCFNF04xbaM0iUS5jVTE9E/edit?usp=sharing
- Figma designs: https://www.figma.com/design/Xzp3pqB8GGrTBIW6leDQkh/coopagregate?node-id=0-1&t=crHfOMSkCjKROOhn-1

## Main pages and features

Manager app:

- **Dashboard**: today's deliveries, stock, sales and money owed to farmers, and a "Needs attention"
  list with links to the matching lists.
- **Record Delivery** and **All deliveries**: record a farmer's delivery by grade and weight, even
  without internet (offline queue, see below). The All deliveries tab lists every delivery, with
  filters, paging and links to delivery details.
- **Members**: register and edit farmers, see their batches and statements. A member can be verified
  through digital identity (eSignet); details that come from eSignet cannot be edited by hand,
  except the address.
- **Lots & Stock**: deliveries are grouped into fixed-size lots by grade, with Active / Sold /
  Emptied / All and grade filters, fill level, losses and lot details.
- **Sales**: record a sale or a multi-grade order. The oldest lots are used first, and the form asks
  how the buyer paid (cash, mobile money or bank, with the transaction reference).
- **Payments**: money in from buyers, one row per order, with the split per farmer.
- **Disburse**: money out to farmers. Shows each farmer's balance (Owed / Settled), pays the whole
  balance, keeps a disbursement history with a method filter and lets the manager reverse a payment.
- **Buyer Requests**: purchase requests sent from the public page. The manager accepts or rejects
  them and can leave a message the buyer can read.
- **Ledger**: the audit trail. Every delivery, sale, share and payment is recorded permanently and
  cannot be edited or deleted; a hash chain check verifies the ledger.
- **Disputes**: deliveries members say are wrong. The manager corrects them, reverses them or
  records that they were correct.
- **Reports**: a summary of one week (Monday to Sunday) that can be printed or saved as PDF through
  the browser's print dialog.
- **Settings**: cooperative details, deduction per kg, grades and floor prices, lot size, minimum
  order, SMS notifications, weekly report recipients, ledger integrity check and password, with a
  history of recent changes.

Public site:

- Available stock by grade, Send Request and Check Request Status pages.
- A privacy notice page (`/privacy`).

Both the manager app and the public site are in English and Kinyarwanda. Kinyarwanda is the
default, and the choice is saved in the browser. The app also works at phone width.

## Technical requirements

Versions below are the ones installed from `package-lock.json` (`package.json` allows newer minor
versions).

| Tool or library      | Version                    | Use                                    |
| -------------------- | -------------------------- | -------------------------------------- |
| Node.js              | 20.19 or newer, or 22.12+  | Required by Vite 8 and vite-plugin-pwa |
| npm                  | comes with Node            | Installs packages, runs scripts        |
| React / React DOM    | 19.3.0                     | User interface                         |
| Vite                 | 8.3.2                      | Dev server and build                   |
| @vitejs/plugin-react | 6.1.2                      | React support in Vite                  |
| vite-plugin-pwa      | 2.0.0                      | Service worker and web app manifest    |
| React Router DOM     | 7.18.4                     | Page routing                           |
| Tailwind CSS         | 4.3.3 (with @tailwindcss/vite 4.3.3) | Styling                      |
| axios                | 1.20.0                     | HTTP calls to the backend              |
| i18next              | 26.4.2                     | Translations                           |
| react-i18next        | 17.0.15                    | Translations in React                  |
| idb                  | 8.0.3                      | IndexedDB for the offline queue        |
| lucide-react         | 1.52.0                     | Icons                                  |

The browser tests also need Google Chrome or Chromium (see Running the tests).

Supported browsers: the build uses Vite's default target, so it runs in Chrome 111+, Edge 111+,
Firefox 114+ and Safari 16.4+ (including Safari on iOS 16.4+). Offline use needs a browser with
service workers and IndexedDB, which all of these have.

## How offline works

When the app is built, vite-plugin-pwa adds a service worker that caches the app itself (HTML,
JavaScript, CSS, icons and fonts), so the manager app opens without internet. API answers are not
cached by the service worker. Members and grades are kept in IndexedDB so the Record Delivery form
still works offline. A delivery recorded offline, or one the server could not take, is saved in an
IndexedDB queue (`src/offline/`) and shown as "Waiting to sync on this device". The queue is sent
one delivery at a time, oldest first: when the app starts, when the connection comes back and every
30 seconds while online. After a network error or a server error, the wait before the next try
doubles from 5 seconds up to 5 minutes. A delivery the server refuses (400, 404 or 409) is marked
as failed, and the manager can retry or discard it. Each delivery has a `clientUuid` made on the
device. If the same delivery is sent twice, the server returns the delivery it already has instead
of saving a second one.

## Repository structure

```
src/
  api/          axios client (client.js) and one file of API calls per area (sales.js, lots.js, ...)
  components/   layout, sidebar, top bar and shared components, plus one folder per area
                (deliveries/, lots/, sales/, payments/, members/, ...)
  context/      AuthContext (the logged-in manager)
  hooks/        custom React hooks (online status, sync state, page size, ...)
  i18n/         i18next setup and the translation files en.json and rw.json
  members/      member detail and identity verification helpers
  offline/      IndexedDB database, delivery queue, sync with retry, cached lists
  pages/
    manager/    manager app pages
    public/     public buyer pages and the privacy notice
  utils/        small helpers (auth token, formatting, phone numbers, quantities)
  App.jsx       routes
  main.jsx      entry point
  index.css     Tailwind import and theme
tests/
  e2e/          browser test suites, and harness/ with the shared start, helpers and end
  mock/         mock API the tests run against
  run.mjs       builds the app, starts the mock and runs the suites
public/         icons, logo and placeholder photos
docs/designs/   design screenshots
```

Reusable components in `src/components/` include:

- `FilterMenu`: the plain-text filter dropdown, for example "Status ⌄" or "Status: Sold ⌄". It
  shows a check on the current option and works with the keyboard.
- `ActionsMenu`: the ⋮ menu on table rows.
- `ConfirmDialog` and `ReasonDialog`: confirmation dialogs; ReasonDialog also asks for a reason.
- `Pagination`, `StatusBadge`, `EmptyState`, `SyncStatus` and `RequiresInternet`.

Design: the screens follow the Figma designs linked above. The style guide colors are Tailwind theme
tokens in the `@theme` block of `src/index.css`:

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

Photos in `public/images/placeholders` (`hero.jpg`, `grade-A.jpg`, `grade-B.jpg`, `grade-C.jpg`)
are temporary. Replace them with the cooperative's own photos (with consent) before real use. To
replace one, save the new photo under the same file name.

## Installation and running locally

1. Clone the repository and install the packages:

   ```
   git clone https://github.com/EMe-U/coopaggregate-frontend.git
   cd coopaggregate-frontend
   npm install
   ```

2. Start the backend (see its repository) on port 8081. The backend reads its port from `PORT` and
   uses 8080 when it is not set, so start it with `PORT=8081`.

3. Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend URL. `.env.example` contains
   `http://localhost:8080`, so change the port to 8081:

   ```
   VITE_API_URL=http://localhost:8081
   ```

4. Start the development server:

   ```
   npm run dev
   ```

5. Open http://localhost:5173.

Data loads only while the backend is running at `VITE_API_URL`. If the server cannot be reached,
the app says so and offers "Try again"; if it is slow to answer (for example while it wakes up on
Render), it says the server is waking up.

## Environment variables

| Name           | Purpose                                                                 | Example value             |
| -------------- | ----------------------------------------------------------------------- | ------------------------- |
| `VITE_API_URL` | Base URL of the backend REST API. Vite reads it at build time.          | `http://localhost:8081`   |
| `CHROME_PATH`  | Optional, browser tests only: path to Chrome or Chromium if it is not in a usual place. | `/path/to/chrome` |

Keep real values in `.env`, which is not committed.

## Running the tests

The repository has browser (end-to-end) tests. They build the app, serve it with `vite preview`
and drive it in headless Chrome. They run against a mock API (`tests/mock/api.mjs`, port 4199)
that keeps its data in memory, not against the live or local backend, so no backend or database is
needed. They need Node.js 22 or newer, because the harness uses Node's built-in WebSocket, and Chrome
or Chromium. Ports 4181, 4199 and 9337 must be free.

```
npm run test:e2e              # all suites
npm run test:e2e:lots         # Lots & Stock (lots-status, lots-emptied, lots-filter-menu)
npm run test:e2e:sales
npm run test:e2e:payments
npm run test:e2e:disburse
npm run test:e2e:deliveries
npm run test:e2e:filters
npm run test:e2e:dashboard
```

Each suite starts with a fresh mock. Builds and screenshots go to `tests/output/`, which is not
committed. The command exits with an error if any check fails.

| Suite            | What it checks                                                                                                                                                       | EN / RW | Phone width |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- |
| lots-status      | Lots & Stock list and detail: fill level, badges, shortfall, the actions in each lot's menu                                                                          | both    | yes         |
| lots-emptied     | The Emptied status, the Active / Sold / Emptied / All filter, "Sold out"                                                                                             | both    | yes         |
| lots-filter-menu | Status and Grade filters as plain-text menus: current option checked, Escape and outside click, keyboard                                                             | both    | yes         |
| sales            | Sale and order preview (oldest lots first, no lot skipping), payment method and reference checks, backend 400 and 409 messages, the result in Payments, member batches, ledger and disputes | both    | yes         |
| payments         | Money in from buyers: one row per order, split per farmer, buyer filter, sidebar                                                                                     | both    | yes         |
| disburse         | Balances with Owed / Settled, the Disburse dialog, backend 400s, disbursement history with method filter and reversal                                               | both    | yes         |
| deliveries       | Record and All deliveries tabs, filters, paging, View details, "Waiting to sync on this device"                                                                      | both    | yes         |
| filters          | Status filter buttons on Buyer Requests, Members and Disputes stay inside the screen at 320, 375 and 390 px; filtering sends the right request                      | both    | yes         |
| dashboard-links  | The "Needs attention" counts match the lists their links open                                                                                                        | EN      | no          |

Latest run (`npm run test:e2e`, 13 November 2026): all 311 checks passed.

| Suite            | Checks passed |
| ---------------- | ------------- |
| dashboard-links  | 13/13         |
| deliveries       | 48/48         |
| disburse         | 49/49         |
| filters          | 23/23         |
| lots-emptied     | 32/32         |
| lots-filter-menu | 35/35         |
| lots-status      | 29/29         |
| payments         | 32/32         |
| sales            | 50/50         |

## Build and deployment

```
npm run build      # production build in dist/
npm run preview    # serve dist/ locally to check it
```

The app is deployed as a Render Static Site with these settings:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL` set to the backend URL. Vite reads this at build time, so a
  redeploy is needed after changing it.
- Redirects/Rewrites: source `/*`, destination `/index.html`, action `Rewrite`. This lets page
  refreshes and direct links work with client-side routing.
- Auto-deploy from the `main` branch.

## Translations

All texts are in `src/i18n/en.json` (English) and `src/i18n/rw.json` (Kinyarwanda); the setup is
in `src/i18n/index.js`. English is used when a Kinyarwanda text is missing. The Kinyarwanda texts
were written without a native speaker. The keys that still need a native speaker's review are
listed in the `_nativeSpeakerReview` block at the end of `rw.json`; remove that block once they are
checked.

## Author and supervisor

Emerance Umurerwa, BSc Software Engineering, African Leadership University.

Supervisor: Bernard Lamptey.
