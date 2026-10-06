/**
 * Hermes ships an incomplete Intl: Arabic plural categories (zero/one/two/few/many) are missing,
 * which breaks ICU plural messages. Load FormatJS PluralRules (+ Locale) for ar/en before any UI.
 */
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill-force.js';
import '@formatjs/intl-pluralrules/locale-data/ar.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
