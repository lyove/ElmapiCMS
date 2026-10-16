import type { Locale } from "./config";

/**
 * Static UI chrome strings (labels, empty states, section eyebrows) that are
 * not editorial content. Page copy itself (headlines, body text, services,
 * posts, FAQs) always comes from Elmapi, not from here.
 */
export type Dictionary = {
  common: {
    skipToContent: string;
    changeLanguage: string;
    openMenu: string;
    closeMenu: string;
    readMore: string;
    learnMore: string;
    viewAll: string;
    exploreHeading: string;
    allRightsReserved: string;
    back: string;
  };
  home: {
    servicesHeading: string;
    servicesSubheading: string;
    servicesViewAll: string;
    workHeading: string;
    workSubheading: string;
    workViewAll: string;
    blogHeading: string;
    blogSubheading: string;
    blogViewAll: string;
    introRegions: string[];
  };
  services: {
    pageEyebrow: string;
    pageHeading: string;
    pageIntro: string;
    deliverablesHeading: string;
    relatedHeading: string;
  };
  work: {
    pageEyebrow: string;
    pageHeading: string;
    pageIntro: string;
    featuredLabel: string;
    emptyState: string;
    backToWork: string;
    clientLabel: string;
    resultsHeading: string;
    servicesHeading: string;
    relatedHeading: string;
  };
  locations: {
    pageEyebrow: string;
    pageHeading: string;
    pageIntro: string;
    headquartersLabel: string;
    emptyState: string;
    backToLocations: string;
    contactHeading: string;
    addressLabel: string;
    phoneLabel: string;
    emailLabel: string;
    hoursLabel: string;
    servicesHeading: string;
    relatedHeading: string;
  };
  blog: {
    pageEyebrow: string;
    pageHeading: string;
    pageIntro: string;
    categoryAll: string;
    featuredLabel: string;
    byAuthor: string;
    relatedHeading: string;
    backToBlog: string;
  };
  about: {
    pageEyebrow: string;
    valuesHeading: string;
    milestonesHeading: string;
    locationsHeading: string;
    locationsSubheading: string;
    locationsViewAll: string;
  };
  contact: {
    pageEyebrow: string;
    directHeading: string;
    faqHeading: string;
    sendingLabel: string;
    messageSentHeading: string;
  };
  notFound: {
    title: string;
    body: string;
    cta: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    common: {
      skipToContent: "Skip to content",
      changeLanguage: "Change language",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      readMore: "Read more",
      learnMore: "Learn more",
      viewAll: "View all",
      exploreHeading: "Explore",
      allRightsReserved: "All rights reserved.",
      back: "Back",
    },
    home: {
      servicesHeading: "What we do",
      servicesSubheading: "Five practices, one coordinated team.",
      servicesViewAll: "View all services",
      workHeading: "Selected work",
      workSubheading: "Cross-border launches where strategy, logistics, and local ops moved together.",
      workViewAll: "View all case studies",
      blogHeading: "Latest from Atlas Group",
      blogSubheading: "Market insights, logistics guides, and company news.",
      blogViewAll: "Visit the blog",
      introRegions: ["Americas", "Europe", "Asia-Pacific"],
    },
    services: {
      pageEyebrow: "Capabilities",
      pageHeading: "Everything a market entry needs, under one roof.",
      pageIntro:
        "From first market assessment to day-to-day operations, our teams stay involved for as long as you need us.",
      deliverablesHeading: "What you get",
      relatedHeading: "Related services",
    },
    work: {
      pageEyebrow: "Work",
      pageHeading: "Case studies from the field.",
      pageIntro:
        "Real market entries across Europe, Latin America, and Asia-Pacific, each tied to the services that made them possible.",
      featuredLabel: "Featured",
      emptyState: "Case studies will appear here once published in Elmapi.",
      backToWork: "Back to work",
      clientLabel: "Client",
      resultsHeading: "Results",
      servicesHeading: "Services involved",
      relatedHeading: "More case studies",
    },
    locations: {
      pageEyebrow: "Locations",
      pageHeading: "Offices on the ground.",
      pageIntro:
        "Four regional offices keep strategy, operations, and local expertise within reach of every engagement.",
      headquartersLabel: "Headquarters",
      emptyState: "Locations will appear here once published in Elmapi.",
      backToLocations: "Back to locations",
      contactHeading: "Visit this office",
      addressLabel: "Address",
      phoneLabel: "Phone",
      emailLabel: "Email",
      hoursLabel: "Hours",
      servicesHeading: "Services from this office",
      relatedHeading: "Other offices",
    },
    blog: {
      pageEyebrow: "Insights",
      pageHeading: "Ideas from the field.",
      pageIntro: "Market analysis, logistics guides, and updates from our global team.",
      categoryAll: "All",
      featuredLabel: "Featured",
      byAuthor: "By",
      relatedHeading: "Related articles",
      backToBlog: "Back to blog",
    },
    about: {
      pageEyebrow: "About",
      valuesHeading: "What we stand for",
      milestonesHeading: "Our story so far",
      locationsHeading: "Where we work",
      locationsSubheading: "Local teams across Americas, Europe, Latin America, and Asia-Pacific.",
      locationsViewAll: "View all locations",
    },
    contact: {
      pageEyebrow: "Contact",
      directHeading: "Direct",
      faqHeading: "Frequently asked questions",
      sendingLabel: "Sending...",
      messageSentHeading: "Message sent",
    },
    notFound: {
      title: "Page not found",
      body: "The page you're looking for doesn't exist or may have moved.",
      cta: "Back to homepage",
    },
  },
  de: {
    common: {
      skipToContent: "Zum Inhalt springen",
      changeLanguage: "Sprache ändern",
      openMenu: "Menü öffnen",
      closeMenu: "Menü schließen",
      readMore: "Weiterlesen",
      learnMore: "Mehr erfahren",
      viewAll: "Alle ansehen",
      exploreHeading: "Entdecken",
      allRightsReserved: "Alle Rechte vorbehalten.",
      back: "Zurück",
    },
    home: {
      servicesHeading: "Was wir tun",
      servicesSubheading: "Fünf Disziplinen, ein koordiniertes Team.",
      servicesViewAll: "Alle Leistungen ansehen",
      workHeading: "Ausgewählte Projekte",
      workSubheading: "Grenzüberschreitende Markteintritte, bei denen Strategie, Logistik und lokale Ops zusammenspielten.",
      workViewAll: "Alle Fallstudien ansehen",
      blogHeading: "Neues von Atlas Group",
      blogSubheading: "Markteinblicke, Logistik-Leitfäden und Unternehmensnachrichten.",
      blogViewAll: "Zum Blog",
      introRegions: ["Amerika", "Europa", "Asien-Pazifik"],
    },
    services: {
      pageEyebrow: "Leistungen",
      pageHeading: "Alles, was ein Markteintritt braucht, unter einem Dach.",
      pageIntro:
        "Von der ersten Marktbewertung bis zum Tagesgeschäft bleiben unsere Teams so lange an Ihrer Seite, wie Sie uns brauchen.",
      deliverablesHeading: "Das erhalten Sie",
      relatedHeading: "Verwandte Leistungen",
    },
    work: {
      pageEyebrow: "Projekte",
      pageHeading: "Fallstudien aus der Praxis.",
      pageIntro:
        "Echte Markteintritte in Europa, Lateinamerika und Asien-Pazifik, jeweils verknüpft mit den Leistungen, die sie möglich machten.",
      featuredLabel: "Empfohlen",
      emptyState: "Fallstudien erscheinen hier, sobald sie in Elmapi veröffentlicht sind.",
      backToWork: "Zurück zu den Projekten",
      clientLabel: "Kunde",
      resultsHeading: "Ergebnisse",
      servicesHeading: "Beteiligte Leistungen",
      relatedHeading: "Weitere Fallstudien",
    },
    locations: {
      pageEyebrow: "Standorte",
      pageHeading: "Büros vor Ort.",
      pageIntro:
        "Vier Regionalbüros halten Strategie, Operations und lokale Expertise für jedes Engagement greifbar.",
      headquartersLabel: "Hauptsitz",
      emptyState: "Standorte erscheinen hier, sobald sie in Elmapi veröffentlicht sind.",
      backToLocations: "Zurück zu den Standorten",
      contactHeading: "Dieses Büro besuchen",
      addressLabel: "Adresse",
      phoneLabel: "Telefon",
      emailLabel: "E-Mail",
      hoursLabel: "Öffnungszeiten",
      servicesHeading: "Leistungen aus diesem Büro",
      relatedHeading: "Andere Büros",
    },
    blog: {
      pageEyebrow: "Einblicke",
      pageHeading: "Ideen aus der Praxis.",
      pageIntro: "Marktanalysen, Logistik-Leitfäden und Neuigkeiten von unserem globalen Team.",
      categoryAll: "Alle",
      featuredLabel: "Empfohlen",
      byAuthor: "Von",
      relatedHeading: "Verwandte Artikel",
      backToBlog: "Zurück zum Blog",
    },
    about: {
      pageEyebrow: "Über uns",
      valuesHeading: "Wofür wir stehen",
      milestonesHeading: "Unsere Geschichte bisher",
      locationsHeading: "Wo wir arbeiten",
      locationsSubheading: "Lokale Teams in Amerika, Europa, Lateinamerika und Asien-Pazifik.",
      locationsViewAll: "Alle Standorte ansehen",
    },
    contact: {
      pageEyebrow: "Kontakt",
      directHeading: "Direkt",
      faqHeading: "Häufig gestellte Fragen",
      sendingLabel: "Wird gesendet...",
      messageSentHeading: "Nachricht gesendet",
    },
    notFound: {
      title: "Seite nicht gefunden",
      body: "Die gesuchte Seite existiert nicht oder wurde verschoben.",
      cta: "Zurück zur Startseite",
    },
  },
  es: {
    common: {
      skipToContent: "Saltar al contenido",
      changeLanguage: "Cambiar idioma",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      readMore: "Leer más",
      learnMore: "Saber más",
      viewAll: "Ver todo",
      exploreHeading: "Explorar",
      allRightsReserved: "Todos los derechos reservados.",
      back: "Volver",
    },
    home: {
      servicesHeading: "Qué hacemos",
      servicesSubheading: "Cinco disciplinas, un equipo coordinado.",
      servicesViewAll: "Ver todos los servicios",
      workHeading: "Proyectos seleccionados",
      workSubheading: "Lanzamientos internacionales donde estrategia, logística y operaciones locales avanzaron juntas.",
      workViewAll: "Ver todos los casos",
      blogHeading: "Lo último de Atlas Group",
      blogSubheading: "Perspectivas de mercado, guías de logística y noticias de la empresa.",
      blogViewAll: "Visitar el blog",
      introRegions: ["Américas", "Europa", "Asia-Pacífico"],
    },
    services: {
      pageEyebrow: "Servicios",
      pageHeading: "Todo lo que necesita una entrada al mercado, bajo un mismo techo.",
      pageIntro:
        "Desde la primera evaluación de mercado hasta las operaciones diarias, nuestros equipos siguen involucrados el tiempo que nos necesites.",
      deliverablesHeading: "Qué obtienes",
      relatedHeading: "Servicios relacionados",
    },
    work: {
      pageEyebrow: "Proyectos",
      pageHeading: "Casos de estudio del terreno.",
      pageIntro:
        "Entradas reales a mercados en Europa, América Latina y Asia-Pacífico, cada una vinculada a los servicios que las hicieron posibles.",
      featuredLabel: "Destacado",
      emptyState: "Los casos de estudio aparecerán aquí cuando se publiquen en Elmapi.",
      backToWork: "Volver a proyectos",
      clientLabel: "Cliente",
      resultsHeading: "Resultados",
      servicesHeading: "Servicios involucrados",
      relatedHeading: "Más casos de estudio",
    },
    locations: {
      pageEyebrow: "Oficinas",
      pageHeading: "Oficinas sobre el terreno.",
      pageIntro:
        "Cuatro oficinas regionales mantienen estrategia, operaciones y experiencia local al alcance de cada proyecto.",
      headquartersLabel: "Sede central",
      emptyState: "Las oficinas aparecerán aquí cuando se publiquen en Elmapi.",
      backToLocations: "Volver a oficinas",
      contactHeading: "Visitar esta oficina",
      addressLabel: "Dirección",
      phoneLabel: "Teléfono",
      emailLabel: "Correo",
      hoursLabel: "Horario",
      servicesHeading: "Servicios desde esta oficina",
      relatedHeading: "Otras oficinas",
    },
    blog: {
      pageEyebrow: "Perspectivas",
      pageHeading: "Ideas desde el terreno.",
      pageIntro: "Análisis de mercado, guías de logística y novedades de nuestro equipo global.",
      categoryAll: "Todos",
      featuredLabel: "Destacado",
      byAuthor: "Por",
      relatedHeading: "Artículos relacionados",
      backToBlog: "Volver al blog",
    },
    about: {
      pageEyebrow: "Nosotros",
      valuesHeading: "En qué creemos",
      milestonesHeading: "Nuestra historia hasta ahora",
      locationsHeading: "Dónde trabajamos",
      locationsSubheading: "Equipos locales en Américas, Europa, América Latina y Asia-Pacífico.",
      locationsViewAll: "Ver todas las oficinas",
    },
    contact: {
      pageEyebrow: "Contacto",
      directHeading: "Directo",
      faqHeading: "Preguntas frecuentes",
      sendingLabel: "Enviando...",
      messageSentHeading: "Mensaje enviado",
    },
    notFound: {
      title: "Página no encontrada",
      body: "La página que buscas no existe o pudo haberse movido.",
      cta: "Volver al inicio",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
