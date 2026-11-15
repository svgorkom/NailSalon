# Requirements

NailSalon is a web app in which one user, a 12-year-old girl who reads well, designs fingernails on a realistic 3D hand. Agreed with the owner on 2026-11-15.

## Users and access

- One user: the owner's daughter. No other accounts, no public gallery.
- Sign-in with her Google account (a Family Link account; the parent approves the sign-in once).
- Only that account can read or write designs; everyone else is refused by the database rules.

## Devices

- Chrome on a laptop (mouse, trackpad) and on a phone (touch). Portrait and landscape on the phone.
- Target 60 fps on a mid-range phone.

## 3D view

- A hand that looks as realistic as possible: realistic skin, lighting and nail materials.
- Rotate, zoom and pan with mouse and touch; a reset-view button.
- Tap or click a nail to select it for editing; the selection is visible.

## Designing a nail

Per selected nail, or for all nails at once:

- **Shape:** round, oval, almond, square, squoval, stiletto, coffin (ballerina).
- **Length:** short to extra long, continuous.
- **Colour:** a palette plus a free colour picker.
- **Finish:** gloss, matte, glitter, metallic, chrome.
- **Patterns:** French tip (colour and depth, with a curved smile line), gradient (ombré), dots, stripes; with their own colours.
- **Stickers:** hearts, stars, flowers and similar; position, size and rotation on the nail.
- **Gems:** 3D rhinestones and pearls glued on the nail (diamond, pearl, heart); position, size, rotation, colour, and solid or clear (see-through); colour and clearness can be changed after placing.
- **Free drawing:** brush with size and colour, eraser.
- Undo and redo for every change; "clear nail" and "clear all".

## Saving and sharing

- Designs are saved in the cloud per account, so laptop and phone show the same designs.
- A "Mijn ontwerpen" overview: open, rename, duplicate, delete.
- Export the current view as a PNG; on the phone also share it via the system share sheet.
- Only images leave the app; designs themselves are never public.

## Language and tone

- UI in Dutch, written for a 12-year-old: short labels, icons with text.
- Code, comments and docs in English.

## Hosting

- Until the last phase the app runs locally on the owner's Windows PC (`npm run dev`).
- Last phase: static site on Cloudflare Workers (static assets), deployed from `main`.
- Sign-in and storage with Firebase (Authentication, Firestore, Storage); `localhost` works for sign-in during local use.

## Out of scope

- Other users, sharing designs (not images) with others, public galleries.
- Painting directly on the 3D surface (drawing is on a 2D pad shown live on the nail; may be added later).
- Offline use.
