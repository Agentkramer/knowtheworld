// Non-sovereign territories shown as their own pages (flag, capital, facts)
// but kept out of the "194 countries" set, the random deck and the quiz.
// Each carries a neutral status note explaining why it is a territory rather
// than a country. Wording here is deliberately factual and non-partisan;
// review before publishing.

export const TERRITORY_CODES = ["GL", "EH", "TW", "PS", "XK", "FK", "PR", "NC"];

// Where Wikidata's P36 is politically loaded or missing, prefer the neutral
// administrative seat from world-countries.
export const CAPITAL_OVERRIDE = {
  PS: "Ramallah",
  EH: "El Aaiún",
};

export const NOTES = {
  GL: {
    de: "Grönland ist ein autonomes Gebiet innerhalb des Königreichs Dänemark und kein souveräner Staat.",
    en: "Greenland is an autonomous territory within the Kingdom of Denmark, not a sovereign state.",
    fr: "Le Groenland est un territoire autonome au sein du royaume du Danemark, et non un État souverain.",
    it: "La Groenlandia è un territorio autonomo all'interno del Regno di Danimarca, non uno Stato sovrano.",
    es: "Groenlandia es un territorio autónomo dentro del Reino de Dinamarca, no un Estado soberano.",
  },
  EH: {
    de: "Die Westsahara ist ein umstrittenes Gebiet, das die Vereinten Nationen als Gebiet ohne Selbstregierung führen. Große Teile werden von Marokko kontrolliert, während die Sahrauische Arabische Demokratische Republik das Gebiet beansprucht.",
    en: "Western Sahara is a disputed territory listed by the United Nations as a non-self-governing territory. Much of it is controlled by Morocco, while the Sahrawi Arab Democratic Republic claims it.",
    fr: "Le Sahara occidental est un territoire contesté, inscrit par les Nations unies parmi les territoires non autonomes. Une grande partie est contrôlée par le Maroc, tandis que la République arabe sahraouie démocratique le revendique.",
    it: "Il Sahara Occidentale è un territorio conteso, elencato dalle Nazioni Unite tra i territori non autonomi. Gran parte è controllata dal Marocco, mentre la Repubblica Araba Saharawi Democratica lo rivendica.",
    es: "El Sáhara Occidental es un territorio en disputa, incluido por las Naciones Unidas entre los territorios no autónomos. Gran parte está controlado por Marruecos, mientras que la República Árabe Saharaui Democrática lo reclama.",
  },
  TW: {
    de: "Taiwan (Republik China) wird eigenständig regiert. Die Volksrepublik China beansprucht das Gebiet; sein völkerrechtlicher Status ist umstritten.",
    en: "Taiwan (Republic of China) is self-governed. The People's Republic of China claims the territory, and its status under international law is disputed.",
    fr: "Taïwan (République de Chine) se gouverne de manière autonome. La République populaire de Chine revendique le territoire, et son statut en droit international est contesté.",
    it: "Taiwan (Repubblica di Cina) si governa autonomamente. La Repubblica Popolare Cinese ne rivendica il territorio e il suo status nel diritto internazionale è controverso.",
    es: "Taiwán (República de China) se gobierna de forma autónoma. La República Popular China reclama el territorio y su estatus en el derecho internacional es discutido.",
  },
  PS: {
    de: "Palästina ist ein teilweise anerkannter Staat, der von zahlreichen Ländern anerkannt und bei den Vereinten Nationen als Beobachterstaat geführt wird.",
    en: "Palestine is a partially recognized state, recognized by many countries and holding non-member observer state status at the United Nations.",
    fr: "La Palestine est un État partiellement reconnu, reconnu par de nombreux pays et disposant du statut d'État observateur non membre aux Nations unies.",
    it: "La Palestina è uno Stato parzialmente riconosciuto, riconosciuto da numerosi paesi e con status di Stato osservatore non membro alle Nazioni Unite.",
    es: "Palestina es un Estado parcialmente reconocido, reconocido por numerosos países y con estatus de Estado observador no miembro en las Naciones Unidas.",
  },
  XK: {
    de: "Der Kosovo erklärte 2008 seine Unabhängigkeit und wird von einem Teil der Staatengemeinschaft anerkannt; sein Status ist umstritten.",
    en: "Kosovo declared independence in 2008 and is recognized by part of the international community; its status is disputed.",
    fr: "Le Kosovo a déclaré son indépendance en 2008 et est reconnu par une partie de la communauté internationale ; son statut est contesté.",
    it: "Il Kosovo ha dichiarato l'indipendenza nel 2008 ed è riconosciuto da una parte della comunità internazionale; il suo status è controverso.",
    es: "Kosovo declaró su independencia en 2008 y es reconocido por una parte de la comunidad internacional; su estatus es discutido.",
  },
  FK: {
    de: "Die Falklandinseln sind ein britisches Überseegebiet. Argentinien beansprucht die Inseln, die auf Spanisch Islas Malvinas heißen.",
    en: "The Falkland Islands are a British Overseas Territory. Argentina claims the islands, known in Spanish as Islas Malvinas.",
    fr: "Les îles Malouines (Falkland) sont un territoire britannique d'outre-mer. L'Argentine revendique les îles.",
    it: "Le isole Falkland (Malvinas) sono un territorio britannico d'oltremare. L'Argentina rivendica le isole.",
    es: "Las Islas Malvinas (Falkland) son un territorio británico de ultramar. Argentina reclama las islas.",
  },
  PR: {
    de: "Puerto Rico ist ein nicht inkorporiertes Außengebiet der Vereinigten Staaten.",
    en: "Puerto Rico is an unincorporated territory of the United States.",
    fr: "Porto Rico est un territoire non incorporé des États-Unis.",
    it: "Porto Rico è un territorio non incorporato degli Stati Uniti.",
    es: "Puerto Rico es un territorio no incorporado de los Estados Unidos.",
  },
  NC: {
    de: "Neukaledonien ist eine französische Übersee-Gemeinschaft mit besonderem Status im Südpazifik.",
    en: "New Caledonia is a French overseas collectivity with special status in the South Pacific.",
    fr: "La Nouvelle-Calédonie est une collectivité française d'outre-mer à statut particulier, dans le Pacifique Sud.",
    it: "La Nuova Caledonia è una collettività francese d'oltremare a statuto speciale, nel Pacifico meridionale.",
    es: "Nueva Caledonia es una colectividad francesa de ultramar con estatus especial, en el Pacífico Sur.",
  },
};
