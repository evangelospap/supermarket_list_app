# Λίστα Supermarket

React/Vite εφαρμογή για ελληνική λίστα supermarket με κοινή αποθήκευση μέσω μικρού Node backend. Η εφαρμογή ξεχωρίζει τι χρειάζεσαι και τι έχεις ήδη σπίτι, οργανώνει προϊόντα σε κατηγορίες, και πλέον υποστηρίζει πρώτο στάδιο αναγνώρισης προϊόντος με barcode/QR scan.

## Τι υποστηρίζει

- Προσθήκη προϊόντων χειροκίνητα.
- Έξυπνη πρόταση κατηγορίας με ελληνικές λέξεις-κλειδιά.
- Custom κατηγορίες.
- Γρήγορη προσθήκη προϊόντος μέσα από κάθε κατηγορία με το κουμπί `+`.
- Σήμανση προϊόντος ως `Το 'χω!` ή `Δεν θέλω`, ώστε να ξεχωρίζει από αυτά που χρειάζεσαι.
- Ελεύθερη ποσότητα για προϊόντα στο `Έχω σπίτι`, π.χ. `2 τεμ`, `500γρ`, `1.5L`.
- Φίλτρα `Όλα`, `Δεν το χρειάζομαι`, `Χρειάζομαι`, `Έχω` και αναζήτηση.
- Confirmation modal πριν τη διαγραφή προϊόντος.
- Κοινή αποθήκευση σε backend JSON αρχείο, ώστε να βλέπεις την ίδια λίστα από κινητό και browser.
- Fallback σε IndexedDB/localStorage αν το backend δεν είναι διαθέσιμο.
- Scanner flow για barcode/QR: αναγνώριση προϊόντος πρώτα, επιλογή κατηγορίας μετά.

## Development

Άνοιξε δύο terminals.

Backend:

```bash
npm.cmd run dev:backend
```

Frontend:

```bash
npm.cmd run dev
```

Το frontend τρέχει συνήθως στο:

```text
http://localhost:5173
```

Το Vite proxy στέλνει τα `/api/*` requests στο backend.

## Χρήση από κινητό ή άλλο browser στο σπίτι

Για κοινή λίστα σε συσκευές στο ίδιο δίκτυο:

```bash
npm.cmd run build
npm.cmd start
```

Μετά άνοιξε από κινητό ή άλλο υπολογιστή:

```text
http://IP-ΤΟΥ-ΥΠΟΛΟΓΙΣΤΗ:8787
```

Παράδειγμα:

```text
http://192.168.1.50:8787
```

Όλες οι αλλαγές αποθηκεύονται στο backend αρχείο:

```text
data/supermarket-state.json
```

Το `data/` είναι στο `.gitignore`, επειδή περιέχει πραγματικά δεδομένα χρήσης και δεν πρέπει να μπαίνει στο repo.

## Scanner προϊόντων

Η ροή είναι σκόπιμα σε δύο στάδια:

1. `Στάδιο 1`: διαβάζουμε barcode/QR ή γράφουμε τον κωδικό χειροκίνητα.
2. Το backend ψάχνει το προϊόν στο Open Food Facts.
3. `Στάδιο 2`: εμφανίζεται όνομα προϊόντος και προτεινόμενη κατηγορία.
4. Ο χρήστης διορθώνει όνομα/κατηγορία αν χρειάζεται.
5. Μόνο τότε το προϊόν προστίθεται στη λίστα.

Στα supermarket τα περισσότερα προϊόντα έχουν barcode/EAN, όχι QR. Το UI γράφει `barcode / QR`, αλλά το πιο συνηθισμένο και χρήσιμο path είναι barcode.

### Περιορισμοί κάμερας

Το camera scan βασίζεται στο browser API `BarcodeDetector` και στο `getUserMedia`.

- Σε desktop browser μπορεί να μη διατίθεται `BarcodeDetector`.
- Σε κινητό η κάμερα συνήθως απαιτεί HTTPS ή `localhost`.
- Για αυτό υπάρχει πάντα manual input κωδικού, ώστε η λειτουργία να μη μπλοκάρει.

## Backend API

Health check:

```http
GET /api/health
```

Φόρτωση κοινής λίστας:

```http
GET /api/state
```

Αποθήκευση κοινής λίστας:

```http
PUT /api/state
```

Αναγνώριση προϊόντος από barcode/QR:

```http
GET /api/products/:code
```

Το product lookup είναι read-only. Δεν προσθέτει μόνο του προϊόν στη λίστα. Η προσθήκη γίνεται μόνο αφού ο χρήστης επιβεβαιώσει το προϊόν και την κατηγορία στο UI.

## Δομή αρχείων

```text
backend/server.js   Node backend, static serving, JSON DB, product lookup
src/App.jsx         React UI, λίστα, scanner, category cards, modals
src/App.css         Design system και responsive layout
src/storage.js      Backend-first persistence με browser fallbacks
```

## Production build

```bash
npm.cmd run build
```

Το build δημιουργείται στο:

```text
dist/
```

Το `npm.cmd start` σερβίρει το `dist/` και τα API endpoints από τον ίδιο Node server.
