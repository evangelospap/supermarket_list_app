# Λίστα Supermarket

React/Vite εφαρμογή για ελληνική λίστα supermarket με backend API και κοινή server-side αποθήκευση.

## Development

Άνοιξε δύο terminals:

```bash
npm.cmd run dev:backend
```

```bash
npm.cmd run dev
```

Το frontend τρέχει συνήθως στο `http://localhost:5173` και κάνει proxy τα `/api/*` requests στο backend.

## Χρήση από κινητό ή άλλο browser

Για κοινή λίστα σε διαφορετικές συσκευές/browsers:

```bash
npm.cmd run build
npm.cmd start
```

Μετά άνοιξε από οποιαδήποτε συσκευή στο ίδιο δίκτυο:

```text
http://IP-ΤΟΥ-ΥΠΟΛΟΓΙΣΤΗ:8787
```

Όλες οι αλλαγές αποθηκεύονται στο backend στο:

```text
data/supermarket-state.json
```

Το `data/` είναι στο `.gitignore`, επειδή περιέχει πραγματικά δεδομένα χρήσης.

## Τι υποστηρίζει

- Προσθήκη προϊόντων.
- Έξυπνη πρόταση κατηγορίας με ελληνικές λέξεις-κλειδιά.
- Χειροκίνητη επιλογή υπάρχουσας ή νέας κατηγορίας.
- Checkbox για `Χρειάζομαι` και `Έχω σπίτι`.
- Φίλτρα και αναζήτηση.
- Κοινή αποθήκευση μέσω backend API.
- Τοπικό fallback σε IndexedDB/localStorage αν το backend δεν είναι διαθέσιμο.
