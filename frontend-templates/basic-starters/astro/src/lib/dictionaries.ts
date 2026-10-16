import type { Locale } from "./i18n";

const en = {
  nav: {
    home: "Home",
    notes: "Notes",
    account: "Account",
    newNote: "New note",
    upload: "Upload",
    login: "Sign in",
    register: "Sign up",
    logout: "Sign out",
  },
  home: {
    title: "Basic starter",
    intro:
      "Reference patterns for Elmapi content, i18n, project-user auth, and BFF writes. Not a branded marketing template.",
    latestNotes: "Latest notes",
    viewAll: "View all notes",
  },
  notes: {
    title: "Notes",
    empty: "No published notes for this locale.",
    page: "Page",
    prev: "Previous",
    next: "Next",
    filtersHeading: "Filters",
    titleContains: "Title contains (like)",
    slugEq: "Slug equals (eq)",
    slugContains: "Slug contains (like)",
    authorContains: "Author contains (like)",
    publishedAfter: "Published after (gte)",
    orTerm: "Title OR slug contains",
    sort: "Sort",
    perPage: "Per page",
    applyFilter: "Apply",
    clearFilter: "Clear",
    queryPreview: "SDK query shape",
    offsetDemo: "Offset slice (limit/offset, no paginate)",
    author: "Author",
    backToList: "Back to notes",
    results: "results",
  },
  auth: {
    loginTitle: "Sign in",
    registerTitle: "Create account",
    email: "Email",
    password: "Password",
    displayName: "Display name",
    submitLogin: "Sign in",
    submitRegister: "Create account",
    noAccount: "Need an account?",
    hasAccount: "Already have an account?",
    logoutFailed: "Could not revoke the backend session. Try again.",
    logoutNetwork: "Network error while logging out. Session was not cleared.",
  },
  account: {
    title: "Account",
    signedInAs: "Signed in as",
    sessionNote:
      "Logout revokes the Elmapi backend session before clearing httpOnly auth cookies.",
  },
  newNote: {
    title: "Create a note",
    intro:
      "Submitted through an Astro API route with the project API token. If you are signed in, me() runs and author-name / author-user-id are stored on the entry.",
    noteTitle: "Title",
    slug: "Slug",
    body: "Body (markdown)",
    submit: "Publish note",
    success: "Note created.",
  },
  upload: {
    title: "Upload an asset",
    intro: "Uploads go through a BFF route that uses the server-only project API token.",
    file: "File",
    alt: "Alt text",
    submit: "Upload",
    success: "Uploaded.",
  },
  locale: {
    switcher: "Language",
  },
  errors: {
    loadFailed: "Could not load content from Elmapi.",
    notFound: "Not found.",
  },
};

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

const de: DeepStringify<typeof en> = {
  nav: {
    home: "Start",
    notes: "Notizen",
    account: "Konto",
    newNote: "Neue Notiz",
    upload: "Upload",
    login: "Anmelden",
    register: "Registrieren",
    logout: "Abmelden",
  },
  home: {
    title: "Basic Starter",
    intro:
      "Referenzmuster fuer Elmapi Content, i18n, Project-User Auth und BFF Writes. Kein Marketing-Template.",
    latestNotes: "Neueste Notizen",
    viewAll: "Alle Notizen",
  },
  notes: {
    title: "Notizen",
    empty: "Keine veroeffentlichten Notizen fuer diese Locale.",
    page: "Seite",
    prev: "Zurueck",
    next: "Weiter",
    filtersHeading: "Filter",
    titleContains: "Titel enthaelt (like)",
    slugEq: "Slug gleich (eq)",
    slugContains: "Slug enthaelt (like)",
    authorContains: "Autor enthaelt (like)",
    publishedAfter: "Veroeffentlicht nach (gte)",
    orTerm: "Titel ODER Slug enthaelt",
    sort: "Sortierung",
    perPage: "Pro Seite",
    applyFilter: "Anwenden",
    clearFilter: "Zuruecksetzen",
    queryPreview: "SDK Query-Form",
    offsetDemo: "Offset-Slice (limit/offset, ohne paginate)",
    author: "Autor",
    backToList: "Zurueck zu Notizen",
    results: "Treffer",
  },
  auth: {
    loginTitle: "Anmelden",
    registerTitle: "Konto erstellen",
    email: "E-Mail",
    password: "Passwort",
    displayName: "Anzeigename",
    submitLogin: "Anmelden",
    submitRegister: "Konto erstellen",
    noAccount: "Noch kein Konto?",
    hasAccount: "Bereits ein Konto?",
    logoutFailed:
      "Backend-Session konnte nicht widerrufen werden. Bitte erneut versuchen.",
    logoutNetwork:
      "Netzwerkfehler beim Abmelden. Session wurde nicht geloescht.",
  },
  account: {
    title: "Konto",
    signedInAs: "Angemeldet als",
    sessionNote:
      "Logout widerruft zuerst die Elmapi Backend-Session und loescht danach die httpOnly Auth-Cookies.",
  },
  newNote: {
    title: "Notiz erstellen",
    intro:
      "Wird ueber eine Astro API-Route mit dem Projekt-API-Token gesendet. Wenn angemeldet, laeuft me() und author-name / author-user-id werden am Eintrag gespeichert.",
    noteTitle: "Titel",
    slug: "Slug",
    body: "Body (Markdown)",
    submit: "Notiz veroeffentlichen",
    success: "Notiz erstellt.",
  },
  upload: {
    title: "Asset hochladen",
    intro:
      "Uploads laufen ueber eine BFF-Route mit dem server-only Projekt-API-Token.",
    file: "Datei",
    alt: "Alt-Text",
    submit: "Hochladen",
    success: "Hochgeladen.",
  },
  locale: {
    switcher: "Sprache",
  },
  errors: {
    loadFailed: "Inhalt konnte nicht von Elmapi geladen werden.",
    notFound: "Nicht gefunden.",
  },
};

export type Dictionary = DeepStringify<typeof en>;

const dictionaries: Record<Locale, Dictionary> = { en, de };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
