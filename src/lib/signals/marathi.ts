/**
 * Everything the interface says, in Marathi.
 *
 * The panel and the map plates read every string from here rather than holding
 * literals, so the product has exactly one place where its voice lives — and so
 * a reviewer can check the whole vocabulary in one screen instead of grepping
 * for Devanagari across a dozen components.
 */
export const MR = {
  brand: "महाराष्ट्र घडतो आहे",
  recordsOne: "नोंद",
  recordsMany: "नोंदी",
  deadline: "मुदत",
  closesToday: "आजच मुदत संपते",
  expired: "मुदत संपली",
  daysLeft: "दिवस शिल्लक",
  daysAgo: "दिवसांपूर्वी संपली",
  openNotice: "मूळ सूचना पाहा",
  report: "माहिती कळवा",
  /** Sits beside it: posting a record onward, rather than telling us about it. */
  share: "शेअर करा",
  /** The report dialog — telling us something on a record looks wrong. */
  reportTitle: "या नोंदीत काही चुकीचं आहे?",
  reportIntro: "खाली थोडक्यात सांगा. आम्ही मूळ सूचनेशी पडताळून पाहू.",
  reportOn: "नोंद",
  reportKind: "काय चुकीचं आहे?",
  reportDetails: "थोडक्यात सांगा",
  reportDetailsHint: "काय चुकीचं आहे आणि बरोबर काय आहे, हे लिहा.",
  reportDetailsPlaceholder: "उदा. गावाचं नाव चुकीचं आहे — ते …",
  reportContact: "संपर्क",
  reportOptional: "ऐच्छिक",
  reportContactHint: "पडताळणीसाठी गरज पडल्यास संपर्क करता येईल.",
  reportContactPlaceholder: "ईमेल किंवा भ्रमणध्वनी",
  reportSubmit: "पाठवा",
  reportCancel: "रद्द करा",
  reportNote: "ही सूचना जिल्ह्याच्या मूळ नोंदीत बदल करत नाही.",
  /** The plate under the legend, and the dialog it opens — a reader sending
   *  in something the pipeline has not seen. */
  leadPrompt: "तुमच्या भागात काही घडतंय?",
  leadHint: "रस्ता, पाणी योजना, नवा प्रकल्प — आम्हाला कळवा.",
  leadCta: "इथे क्लिक करा",
  /** The same button on a phone, where the plate collapses to a pill beside the
   *  statewide badge and the prompt above it is no longer there to be read.
   *  "Click here" alone would then name no destination, so the short form says
   *  the thing itself rather than the gesture. */
  leadCtaShort: "माहिती कळवा",
  leadTitle: "तुमच्याकडे एखादी माहिती आहे?",
  leadIntro: "खाली थोडक्यात सांगा. आम्ही पडताळून पाहू आणि मगच नकाशावर घेऊ.",
  leadKind: "कोणत्या प्रकारची माहिती?",
  leadPlace: "ठिकाण",
  leadPlaceHint: "गाव, तालुका आणि जिल्हा — जेवढं माहीत आहे तेवढं.",
  leadPlacePlaceholder: "उदा. आळंदी, खेड तालुका, पुणे",
  leadDetails: "काय घडतंय?",
  leadDetailsHint: "काय, कुठे आणि कोण करतंय, हे लिहा.",
  leadDetailsPlaceholder: "उदा. आमच्या गावात नवीन पाणीपुरवठा योजनेचं काम सुरू झालं आहे …",
  leadSource: "दुवा किंवा पुरावा",
  leadSourceHint: "बातमी, शासकीय सूचना किंवा छायाचित्राचा दुवा असल्यास द्या.",
  leadSourcePlaceholder: "https://",
  leadSubmit: "माहिती पाठवा",
  leadNote: "पडताळणी झाल्यावरच नोंद नकाशावर दिसेल.",
  close: "बंद करा",
  zoomIn: "जवळून पाहा",
  zoomOut: "दूरून पाहा",
  resetView: "नकाशा पूर्ववत",
  /** On a cluster badge — clicking fans it out rather than opening a record. */
  openCluster: "सर्व नोंदी पाहण्यासाठी क्लिक करा",
  district: "जिल्हा",
  /* The badge in the corner of the sheet, and what it switches the map to.
     `statewide` names the thing; `statewideHint` says what clicking does, and
     changes once it is on, because a pressed toggle whose label still describes
     the way in is a toggle nobody can find the way out of. */
  statewide: "महाराष्ट्रभर",
  statewideHint: "राज्यभरच्या नोंदी",
  statewideBack: "जिल्ह्यांकडे परत",
  /** Where a statewide record is — said in full rather than left blank. */
  allMaharashtra: "संपूर्ण महाराष्ट्र",
  /** Stands in for the pulse line while the map is showing the state. */
  statewideIntro: "राज्यभर लागू होणारी धोरणं आणि योजना.",
  prevRecord: "मागील नोंद",
  nextRecord: "पुढील नोंद",
  /** The ticker across the top of the page, and the plate that names it. */
  newsLabel: "ताज्या नोंदी",
  newsAria: "ताज्या नोंदींची पट्टी",
  /** Follows a figure: "२५ पैकी निवडक" — selected out of 25. */
  selectedFrom: "पैकी निवडक",
  /* --- The filters, under the pulse line ---------------------------------
     Two axes and a way out of them. `filtersEmpty` is the one line the legend
     prints when a combination matches nothing: a plate that simply goes blank
     reads as a map that broke rather than as an answer. */
  filters: "गाळणी",
  filterSector: "क्षेत्र",
  filterStatus: "सद्यस्थिती",
  filterClear: "सर्व दाखवा",
  filtersEmpty: "या गाळणीत एकही नोंद नाही.",
  /** Read out to a screen reader on a chip, before the sector or stage name. */
  filterToggle: "गाळणी लावा",
  /** The stage meter's heading in the record panel. */
  stage: "सद्यस्थिती",
  /** Heads the `impact` line — "what this means for you". */
  meaning: "याचा अर्थ काय",
  /** The implementing body, on the facts list. */
  agency: "यंत्रणा",
  boundaryNote: "जिल्हा सीमा निर्देशात्मक · geoBoundaries",
} as const;

const MONTHS_MR = [
  "जानेवारी",
  "फेब्रुवारी",
  "मार्च",
  "एप्रिल",
  "मे",
  "जून",
  "जुलै",
  "ऑगस्ट",
  "सप्टेंबर",
  "ऑक्टोबर",
  "नोव्हेंबर",
  "डिसेंबर",
];

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

/** ASCII digits to Devanagari, in place — everything else passes through. */
export function toDevanagari(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => DEVANAGARI_DIGITS[Number(digit)]);
}

/** `2026-08-18` → `१८ ऑगस्ट २०२६`. */
export function formatDateMr(iso: string | undefined): string | null {
  if (!iso) return null;

  // Parsed by hand rather than through `new Date(iso)`: a bare `YYYY-MM-DD`
  // is read as UTC midnight, which is the previous day for any reader west of
  // Greenwich. The date on a government release is a calendar date, not an
  // instant, so it is taken apart as one.
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  return `${toDevanagari(day)} ${MONTHS_MR[month - 1]} ${toDevanagari(year)}`;
}
