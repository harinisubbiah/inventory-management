# Inventory Management System

A browser-based inventory management system built with **plain HTML5, CSS3, and vanilla JavaScript** — no frameworks, no build step, no dependencies. Originally a C console program with seven menu-driven operations; rebuilt here as a full multi-page web application with the same core logic underneath.

## Features

**Core inventory logic**
- ✔ Add new products, with input validation
- ✔ Search products, filtered as you type
- ✔ Update quantity and price independently
- ✔ Display the complete inventory in a sortable, filterable table
- ✔ Calculate total inventory value (`Σ quantity × price`), recalculated live
- ✔ Duplicate product detection (case-insensitive name match)

**Dashboard**
- Sidebar navigation (Dashboard, Inventory, Analytics, Reports, Settings)
- Stat cards: total products, total inventory value, low/out-of-stock count, items updated in the last 24h
- Three dependency-free Canvas charts: inventory distribution, product quantities, stock status
- Top nav with live search, a notifications dropdown, and a profile menu

**Inventory table**
- Sort by name, quantity, or price (click any column header)
- Filter by status: In Stock / Low Stock / Out of Stock
- Color-coded status badges (green / amber / red)
- Inline edit and delete actions, with a confirmation step before deleting

**Extras**
- Dark / light mode, persisted across visits
- Fully responsive, down to mobile
- Inventory persists in `localStorage` — survives a refresh
- Export the inventory to CSV or JSON
- Toast notifications for every add / update / delete / duplicate-blocked action
- A simple frontend-only login/logout screen (demo auth — any email/password works)
- An activity log (under **Reports**) recording every inventory action with a timestamp

## Technologies used

- HTML5 (semantic markup, no frameworks)
- CSS3 (custom properties for theming, Grid/Flexbox layout, keyframe animations)
- Vanilla JavaScript (ES6+: modules-via-IIFE, arrow functions, template literals, destructuring)
- Browser `localStorage` for persistence
- HTML Canvas 2D API for charts (no charting library)

## Running

```bash
# Python
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.


## Future improvements

- Product categories/tags and category-based filtering
- Bulk import from CSV (the inverse of the existing export)
- Pagination for very large inventories
- A real backend + database instead of `localStorage`, with actual authentication
- Per-user accounts and role-based permissions (admin vs. read-only)
- Unit tests for the `Inventory` module's core logic

## Learning outcomes

This project was an exercise in:
- Porting procedural C logic (structs, linear search, manual duplicate checks) into idiomatic JavaScript objects and array methods
- Building a multi-page vanilla JS app without a framework or router — page-to-page state via `localStorage`, in-page state via a small section-toggling controller
- Drawing real, interactive charts directly on `<canvas>` without a charting library
- Designing a consistent design-token system (CSS custom properties) that powers both a marketing landing page and an admin dashboard, including dark/light theming
- Structuring vanilla JS into single-responsibility modules (storage / inventory logic / notifications / charts / analytics / app controller) to keep the codebase maintainable without a bundler

# Author

