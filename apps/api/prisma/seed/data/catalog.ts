/** Seed catalog: fictional brands, realistic Saudi wholesale assortment (VAT-exclusive prices per base unit). */

export interface SeedCategory {
  slug: string;
  ar: string;
  en: string;
  icon: string;
  image: string;
  featured?: boolean;
  children: { slug: string; ar: string; en: string }[];
}

export const CATEGORIES: SeedCategory[] = [
  { slug: 'coffee-tea', ar: 'البن والشاي', en: 'Coffee & Tea', icon: 'coffee', image: 'coffee beans sack', featured: true, children: [
    { slug: 'green-coffee', ar: 'بن أخضر', en: 'Green coffee' },
    { slug: 'roasted-coffee', ar: 'بن محمص', en: 'Roasted coffee' },
    { slug: 'arabic-coffee', ar: 'قهوة عربية', en: 'Arabic coffee' },
    { slug: 'tea', ar: 'شاي', en: 'Tea' },
  ] },
  { slug: 'dates', ar: 'التمور', en: 'Dates', icon: 'palmtree', image: 'dates fruit market', featured: true, children: [
    { slug: 'premium-dates', ar: 'تمور فاخرة', en: 'Premium dates' },
    { slug: 'bulk-dates', ar: 'تمور بالجملة', en: 'Bulk dates' },
    { slug: 'date-products', ar: 'منتجات التمور', en: 'Date products' },
  ] },
  { slug: 'rice', ar: 'الأرز', en: 'Rice', icon: 'wheat', image: 'basmati rice grains', featured: true, children: [
    { slug: 'basmati-rice', ar: 'أرز بسمتي', en: 'Basmati rice' },
    { slug: 'sella-rice', ar: 'أرز مزة وسيلا', en: 'Sella rice' },
    { slug: 'medium-grain-rice', ar: 'أرز متوسط الحبة', en: 'Medium grain rice' },
  ] },
  { slug: 'grains-legumes', ar: 'الحبوب والبقوليات', en: 'Grains & Legumes', icon: 'bean', image: 'lentils legumes bowls', featured: true, children: [
    { slug: 'lentils', ar: 'عدس', en: 'Lentils' },
    { slug: 'chickpeas-beans', ar: 'حمص وفول', en: 'Chickpeas & beans' },
    { slug: 'wheat-bulgur', ar: 'قمح وبرغل', en: 'Wheat & bulgur' },
  ] },
  { slug: 'sugar-flour', ar: 'السكر والدقيق', en: 'Sugar & Flour', icon: 'package', image: 'flour sacks bakery', featured: true, children: [
    { slug: 'sugar', ar: 'سكر', en: 'Sugar' },
    { slug: 'flour', ar: 'دقيق', en: 'Flour' },
    { slug: 'salt', ar: 'ملح', en: 'Salt' },
  ] },
  { slug: 'oils-ghee', ar: 'الزيوت والسمن', en: 'Oils & Ghee', icon: 'droplet', image: 'olive oil bottles', featured: true, children: [
    { slug: 'vegetable-oil', ar: 'زيت نباتي', en: 'Vegetable oil' },
    { slug: 'olive-oil', ar: 'زيت زيتون', en: 'Olive oil' },
    { slug: 'ghee', ar: 'سمن', en: 'Ghee' },
  ] },
  { slug: 'canned-food', ar: 'المعلبات', en: 'Canned food', icon: 'archive', image: 'canned food shelves', children: [
    { slug: 'tuna', ar: 'تونة', en: 'Tuna' },
    { slug: 'canned-vegetables', ar: 'خضار وبقوليات معلبة', en: 'Canned vegetables' },
    { slug: 'tomato-paste', ar: 'معجون طماطم', en: 'Tomato paste' },
  ] },
  { slug: 'beverages', ar: 'المشروبات', en: 'Beverages', icon: 'cup-soda', image: 'bottled water pallet', featured: true, children: [
    { slug: 'water', ar: 'مياه', en: 'Water' },
    { slug: 'juices', ar: 'عصائر', en: 'Juices' },
    { slug: 'soft-drinks', ar: 'مشروبات غازية', en: 'Soft drinks' },
  ] },
  { slug: 'dairy', ar: 'الألبان والأجبان', en: 'Dairy & Cheese', icon: 'milk', image: 'cheese dairy products', children: [
    { slug: 'milk', ar: 'حليب', en: 'Milk' },
    { slug: 'cheese', ar: 'أجبان', en: 'Cheese' },
    { slug: 'laban-yogurt', ar: 'لبن وزبادي', en: 'Laban & yogurt' },
  ] },
  { slug: 'frozen', ar: 'اللحوم والمجمدات', en: 'Meat & Frozen', icon: 'snowflake', image: 'frozen chicken meat', featured: true, children: [
    { slug: 'frozen-chicken', ar: 'دجاج مجمد', en: 'Frozen chicken' },
    { slug: 'frozen-meat', ar: 'لحوم مجمدة', en: 'Frozen meat' },
    { slug: 'frozen-vegetables', ar: 'خضار مجمدة', en: 'Frozen vegetables' },
  ] },
  { slug: 'spices', ar: 'البهارات والتوابل', en: 'Spices', icon: 'flame', image: 'spices market colorful', children: [
    { slug: 'whole-spices', ar: 'بهارات حب', en: 'Whole spices' },
    { slug: 'ground-spices', ar: 'بهارات مطحونة', en: 'Ground spices' },
    { slug: 'saffron-cardamom', ar: 'زعفران وهيل', en: 'Saffron & cardamom' },
  ] },
  { slug: 'cleaning', ar: 'المنظفات', en: 'Cleaning', icon: 'sparkles', image: 'cleaning supplies detergent', children: [
    { slug: 'detergents', ar: 'مساحيق ومنظفات', en: 'Detergents' },
    { slug: 'dishwash', ar: 'سائل جلي', en: 'Dishwashing' },
    { slug: 'tissues', ar: 'مناديل وورق', en: 'Tissues & paper' },
  ] },
  { slug: 'horeca-supplies', ar: 'مستلزمات المطاعم والمقاهي', en: 'HoReCa supplies', icon: 'utensils', image: 'takeaway coffee cups', children: [
    { slug: 'cups', ar: 'أكواب ورقية', en: 'Paper cups' },
    { slug: 'food-containers', ar: 'علب حفظ الطعام', en: 'Food containers' },
    { slug: 'gloves-wraps', ar: 'قفازات وتغليف', en: 'Gloves & wraps' },
  ] },
];

export const BRANDS: { slug: string; ar: string; en: string; origin?: string; featured?: boolean; color: string }[] = [
  { slug: 'al-waha', ar: 'الواحة', en: 'Al Waha', origin: 'SA', featured: true, color: '#0A9B69' },
  { slug: 'qassim-palms', ar: 'نخيل القصيم', en: 'Qassim Palms', origin: 'SA', featured: true, color: '#7A4B1E' },
  { slug: 'jazeera-coffee', ar: 'بن الجزيرة', en: 'Jazeera Coffee', origin: 'SA', featured: true, color: '#5B3A29' },
  { slug: 'aseel-tea', ar: 'شاي الأصيل', en: 'Aseel Tea', origin: 'LK', color: '#9E2A2B' },
  { slug: 'golden-grain', ar: 'الأرز الذهبي', en: 'Golden Grain', origin: 'IN', featured: true, color: '#C9A227' },
  { slug: 'sanabel', ar: 'سنابل الخير', en: 'Sanabel', origin: 'SA', featured: true, color: '#B7791F' },
  { slug: 'hala', ar: 'حلا', en: 'Hala', origin: 'SA', color: '#2B6CB0' },
  { slug: 'zaytouna', ar: 'زيتونة', en: 'Zaytouna', origin: 'ES', color: '#556B2F' },
  { slug: 'badia-ghee', ar: 'سمن البادية', en: 'Badia Ghee', origin: 'SA', color: '#D69E2E' },
  { slug: 'arabian-sea', ar: 'بحر العرب', en: 'Arabian Sea', origin: 'TH', color: '#1E4E79' },
  { slug: 'tamayoz', ar: 'تميّز', en: 'Tamayoz', origin: 'EG', color: '#C53030' },
  { slug: 'najd-springs', ar: 'ينابيع نجد', en: 'Najd Springs', origin: 'SA', featured: true, color: '#3182CE' },
  { slug: 'fresha', ar: 'فريشة', en: 'Fresha', origin: 'SA', color: '#DD6B20' },
  { slug: 'fizzo', ar: 'فيزو', en: 'Fizzo', origin: 'SA', color: '#E53E3E' },
  { slug: 'bashayer', ar: 'مزارع البشاير', en: 'Bashayer Farms', origin: 'SA', featured: true, color: '#2F855A' },
  { slug: 'safwa-poultry', ar: 'دواجن الصفوة', en: 'Safwa Poultry', origin: 'SA', color: '#C05621' },
  { slug: 'north-pastures', ar: 'مراعي الشمال', en: 'North Pastures', origin: 'AU', color: '#742A2A' },
  { slug: 'al-reem', ar: 'بهارات الريم', en: 'Al Reem Spices', origin: 'IN', featured: true, color: '#B83280' },
  { slug: 'naqaa', ar: 'نقاء', en: 'Naqaa', origin: 'SA', color: '#319795' },
  { slug: 'safi', ar: 'صافي', en: 'Safi', origin: 'SA', color: '#4A5568' },
  { slug: 'packpro', ar: 'باك برو', en: 'PackPro', origin: 'CN', featured: true, color: '#0B2D5B' },
];

export interface SeedUnit {
  code: 'PIECE' | 'PACK' | 'BOX' | 'CARTON' | 'BAG' | 'SACK' | 'KG' | 'TON' | 'LITER' | 'BOTTLE' | 'CAN' | 'TRAY' | 'PALLET';
  ar: string;
  en: string;
  qty: number;
  baseAr: string;
  baseEn: string;
  weightKg?: number;
}

export interface SeedProduct {
  slug: string;
  ar: string;
  en: string;
  cat: string;
  brand?: string;
  origin: string;
  storage?: 'AMBIENT' | 'CHILLED' | 'FROZEN';
  /** VAT-exclusive price per base unit (kg / piece / liter). */
  base: number;
  units: SeedUnit[];
  /** Minimum order per unit index (defaults 1). */
  moq?: number[];
  img: string;
  specs: [string, string, string, string][];
  tags?: string[];
  descAr: string;
  descEn: string;
  featured?: boolean;
}

const KG = { baseAr: 'كجم', baseEn: 'kg' };
const PC = { baseAr: 'حبة', baseEn: 'piece' };
const L = { baseAr: 'لتر', baseEn: 'liter' };
const sack = (kg: number): SeedUnit => ({ code: 'SACK', ar: `شوال ${kg} كجم`, en: `${kg} kg sack`, qty: kg, weightKg: kg, ...KG });
const bag = (kg: number): SeedUnit => ({ code: 'BAG', ar: `كيس ${kg} كجم`, en: `${kg} kg bag`, qty: kg, weightKg: kg, ...KG });
const ton: SeedUnit = { code: 'TON', ar: 'طن', en: 'Ton', qty: 1000, weightKg: 1000, ...KG };
const kg: SeedUnit = { code: 'KG', ar: 'كيلوجرام', en: 'Kilogram', qty: 1, weightKg: 1, ...KG };
const carton = (n: number, size: string, sizeEn: string, base = PC): SeedUnit => ({ code: 'CARTON', ar: `كرتون ${n} × ${size}`, en: `Carton ${n} × ${sizeEn}`, qty: n, ...base });
const box = (n: number, label: string, labelEn: string, base = PC): SeedUnit => ({ code: 'BOX', ar: label, en: labelEn, qty: n, ...base });
const spec = (keyAr: string, keyEn: string, valueAr: string, valueEn: string): [string, string, string, string] => [keyAr, keyEn, valueAr, valueEn];

export const PRODUCTS: SeedProduct[] = [
  // ------------------------------------------------ coffee & tea
  { slug: 'green-coffee-brazil-17-18', ar: 'بن أخضر برازيلي 17/18 سكرين', en: 'Brazil green coffee 17/18 screen', cat: 'green-coffee', brand: 'jazeera-coffee', origin: 'BR', base: 18.5, units: [sack(60), ton], moq: [5, 1], img: 'green coffee beans burlap', featured: true, tags: ['best-seller', 'bulk'],
    specs: [spec('النوع', 'Type', 'أرابيكا', 'Arabica'), spec('السكرين', 'Screen', '17/18', '17/18'), spec('الرطوبة', 'Moisture', '10-12%', '10-12%'), spec('التعبئة', 'Packing', 'أكياس خيش 60 كجم', '60 kg jute bags')],
    descAr: 'بن أخضر برازيلي مغسول بجودة تصدير، مناسب للمحامص ومصانع القهوة، حبة متجانسة ونكهة شوكولاتة ومكسرات.', descEn: 'Export-grade washed Brazilian green coffee for roasters, uniform beans with chocolate and nutty notes.' },
  { slug: 'green-coffee-colombia-supremo', ar: 'بن أخضر كولومبي سوبريمو', en: 'Colombia Supremo green coffee', cat: 'green-coffee', brand: 'jazeera-coffee', origin: 'CO', base: 19.8, units: [sack(70), ton], moq: [4, 1], img: 'coffee beans raw green', tags: ['bulk'],
    specs: [spec('النوع', 'Type', 'أرابيكا', 'Arabica'), spec('السكرين', 'Screen', '17/18', '17/18'), spec('المعالجة', 'Process', 'مغسول', 'Washed')],
    descAr: 'بن كولومبي سوبريمو بحموضة متوازنة وقوام متوسط، الخيار المفضل للمحامص المختصة.', descEn: 'Colombian Supremo with balanced acidity and medium body, a favourite for specialty roasters.' },
  { slug: 'green-coffee-ethiopia-sidamo', ar: 'بن أخضر إثيوبي سيدامو', en: 'Ethiopia Sidamo green coffee', cat: 'green-coffee', brand: 'jazeera-coffee', origin: 'ET', base: 22, units: [sack(60), ton], moq: [3, 1], img: 'ethiopian coffee beans', tags: ['specialty'],
    specs: [spec('الدرجة', 'Grade', 'G2', 'G2'), spec('المعالجة', 'Process', 'مجفف طبيعيًا', 'Natural'), spec('النكهات', 'Notes', 'توت وزهور', 'Berry & floral')],
    descAr: 'بن سيدامو إثيوبي بنكهات فاكهية وزهرية مميزة، مثالي للقهوة المختصة.', descEn: 'Ethiopian Sidamo with distinctive fruity and floral notes, ideal for specialty coffee.' },
  { slug: 'green-coffee-yemen-haraz', ar: 'بن يمني حرازي', en: 'Yemeni Haraz coffee', cat: 'green-coffee', brand: 'jazeera-coffee', origin: 'YE', base: 48, units: [bag(30), kg], moq: [1, 25], img: 'coffee beans roasting', tags: ['premium'],
    specs: [spec('المنطقة', 'Region', 'حراز', 'Haraz'), spec('المعالجة', 'Process', 'طبيعي', 'Natural')],
    descAr: 'بن يمني حرازي نادر بجودة عالية، مطلوب للقهوة العربية الفاخرة.', descEn: 'Rare high-grade Yemeni Haraz coffee, sought after for premium Arabic coffee.' },
  { slug: 'roasted-espresso-blend', ar: 'بن محمص إسبريسو بلند', en: 'Espresso blend roasted beans', cat: 'roasted-coffee', brand: 'jazeera-coffee', origin: 'SA', base: 62, units: [bag(1), carton(6, '1 كجم', '1 kg', KG)], img: 'roasted coffee beans dark', featured: true, tags: ['horeca', 'best-seller'],
    specs: [spec('التحميص', 'Roast', 'غامق متوسط', 'Medium-dark'), spec('المزيج', 'Blend', '80% أرابيكا / 20% روبوستا', '80% Arabica / 20% Robusta')],
    descAr: 'مزيج إسبريسو محمص طازج للمقاهي، كريما كثيفة وطعم متوازن مع الحليب.', descEn: 'Freshly roasted espresso blend for cafés, rich crema and balanced with milk.' },
  { slug: 'arabic-coffee-cardamom', ar: 'قهوة عربية بالهيل - محمصة شقراء', en: 'Arabic coffee with cardamom (light roast)', cat: 'arabic-coffee', brand: 'jazeera-coffee', origin: 'SA', base: 55, units: [carton(12, '500 جم', '500 g', { baseAr: 'عبوة', baseEn: 'pack' }), bag(5)], img: 'arabic coffee dallah', tags: ['best-seller'],
    specs: [spec('التحميص', 'Roast', 'أشقر', 'Light'), spec('الإضافات', 'Blend', 'هيل وزعفران', 'Cardamom & saffron')],
    descAr: 'قهوة عربية سعودية جاهزة بالهيل والزعفران، مثالية للفنادق والمطاعم والمناسبات.', descEn: 'Ready Saudi Arabic coffee with cardamom and saffron for hotels, restaurants and events.' },
  { slug: 'black-tea-ceylon', ar: 'شاي أسود سيلاني فاخر', en: 'Premium Ceylon black tea', cat: 'tea', brand: 'aseel-tea', origin: 'LK', base: 38, units: [carton(12, '1 كجم', '1 kg', KG), box(100, 'علبة 100 كيس', 'Box of 100 bags')], img: 'black tea leaves', tags: ['horeca'],
    specs: [spec('النوع', 'Type', 'أوراق كاملة BOP', 'BOP leaf'), spec('المنشأ', 'Origin', 'سريلانكا', 'Sri Lanka')],
    descAr: 'شاي سيلاني أسود بطعم قوي ولون أحمر صافٍ، مناسب للمقاهي والمطاعم.', descEn: 'Strong Ceylon black tea with a clear red cup, suited to cafés and restaurants.' },
  { slug: 'green-tea-bags', ar: 'شاي أخضر أكياس', en: 'Green tea bags', cat: 'tea', brand: 'aseel-tea', origin: 'CN', base: 0.35, units: [box(100, 'علبة 100 كيس', 'Box of 100 bags'), carton(1200, '12 علبة', '12 boxes')], img: 'green tea cup', tags: [],
    specs: [spec('العدد', 'Count', '100 كيس', '100 bags')], descAr: 'شاي أخضر صيني في أكياس مغلفة فرديًا.', descEn: 'Individually wrapped Chinese green tea bags.' },

  // ------------------------------------------------ dates
  { slug: 'sukkari-dates-premium', ar: 'تمر سكري مفتل فاخر', en: 'Premium Sukkari dates (Mufattal)', cat: 'premium-dates', brand: 'qassim-palms', origin: 'SA', base: 28, units: [box(3, 'كرتون 3 كجم', '3 kg carton', KG), box(10, 'كرتون 10 كجم', '10 kg carton', KG)], img: 'sukkari dates', featured: true, tags: ['best-seller', 'ramadan'],
    specs: [spec('الصنف', 'Variety', 'سكري مفتل', 'Sukkari Mufattal'), spec('المنطقة', 'Region', 'القصيم', 'Qassim'), spec('الموسم', 'Season', '2026', '2026')],
    descAr: 'تمر سكري قصيمي مفتل بجودة ممتازة، طري وحلو الطعم، مثالي للضيافة والتجزئة.', descEn: 'Excellent-grade Qassim Sukkari Mufattal dates, soft and sweet, perfect for hospitality and retail.' },
  { slug: 'ajwa-madinah', ar: 'تمر عجوة المدينة', en: 'Madinah Ajwa dates', cat: 'premium-dates', brand: 'al-waha', origin: 'SA', base: 65, units: [box(1, 'علبة 1 كجم', '1 kg box', KG), box(5, 'كرتون 5 كجم', '5 kg carton', KG)], img: 'ajwa dates', tags: ['premium'],
    specs: [spec('الصنف', 'Variety', 'عجوة', 'Ajwa'), spec('المنطقة', 'Region', 'المدينة المنورة', 'Madinah')],
    descAr: 'عجوة المدينة الأصلية بحبات متوسطة ومذاق غني.', descEn: 'Authentic Madinah Ajwa with medium fruit and a rich taste.' },
  { slug: 'medjool-dates-large', ar: 'تمر مجدول حبة كبيرة', en: 'Medjool dates (large)', cat: 'premium-dates', brand: 'al-waha', origin: 'SA', base: 58, units: [box(5, 'كرتون 5 كجم', '5 kg carton', KG)], img: 'medjool dates', tags: [],
    specs: [spec('الحجم', 'Size', 'جامبو', 'Jumbo')], descAr: 'مجدول بحبات كبيرة ولحم كثيف، الأنسب للهدايا والفنادق.', descEn: 'Large meaty Medjool dates, ideal for gifting and hotels.' },
  { slug: 'khalas-dates-bulk', ar: 'تمر خلاص الأحساء بالجملة', en: 'Al-Ahsa Khalas dates (bulk)', cat: 'bulk-dates', brand: 'qassim-palms', origin: 'SA', base: 12.5, units: [box(10, 'كرتون 10 كجم', '10 kg carton', KG), ton], moq: [20, 1], img: 'dates pile market', featured: true, tags: ['bulk'],
    specs: [spec('الصنف', 'Variety', 'خلاص', 'Khalas'), spec('المنطقة', 'Region', 'الأحساء', 'Al-Ahsa')],
    descAr: 'تمر خلاص أحسائي بالجملة للمطاعم والمصانع والمناسبات.', descEn: 'Wholesale Al-Ahsa Khalas dates for restaurants, factories and events.' },
  { slug: 'segai-dates-bulk', ar: 'تمر صقعي بالجملة', en: 'Segai dates (bulk)', cat: 'bulk-dates', brand: 'qassim-palms', origin: 'SA', base: 14, units: [box(10, 'كرتون 10 كجم', '10 kg carton', KG)], moq: [10], img: 'dates boxes', tags: ['bulk'],
    specs: [spec('الصنف', 'Variety', 'صقعي', 'Segai')], descAr: 'صقعي نصف رطب بطعم مميز للبيع بالجملة.', descEn: 'Semi-soft Segai dates with a distinctive taste, wholesale packs.' },
  { slug: 'date-paste-industrial', ar: 'عجينة تمر صناعية', en: 'Industrial date paste', cat: 'date-products', brand: 'al-waha', origin: 'SA', base: 7.5, units: [box(15, 'كرتون 15 كجم', '15 kg carton', KG)], moq: [10], img: 'date paste', tags: ['bakery'],
    specs: [spec('الاستخدام', 'Use', 'مخابز وحلويات', 'Bakeries & sweets')], descAr: 'عجينة تمر نقية للمخابز ومصانع المعمول.', descEn: 'Pure date paste for bakeries and maamoul makers.' },
  { slug: 'date-syrup-dibs', ar: 'دبس تمر طبيعي', en: 'Natural date syrup (dibs)', cat: 'date-products', brand: 'al-waha', origin: 'SA', base: 18, units: [carton(12, '400 جم', '400 g', { baseAr: 'عبوة', baseEn: 'bottle' })], img: 'date syrup honey', tags: [],
    specs: [spec('الحجم', 'Size', '400 جم', '400 g')], descAr: 'دبس تمر طبيعي 100% بدون إضافات.', descEn: '100% natural date syrup with no additives.' },

  // ------------------------------------------------ rice
  { slug: 'basmati-1121-sella', ar: 'أرز بسمتي 1121 سيلا ذهبي', en: 'Basmati 1121 golden sella rice', cat: 'basmati-rice', brand: 'golden-grain', origin: 'IN', base: 7.2, units: [bag(40), ton], moq: [10, 1], img: 'basmati rice sack', featured: true, tags: ['best-seller', 'bulk'],
    specs: [spec('الطول', 'Length', '8.35 مم', '8.35 mm'), spec('التعتيق', 'Aging', '12 شهر', '12 months'), spec('الكسر', 'Broken', 'أقل من 1%', '<1%')],
    descAr: 'أرز بسمتي هندي 1121 سيلا ذهبي معتق، حبة طويلة لا تتكسر، الخيار الأول للمطاعم والمطابخ المركزية.', descEn: 'Aged Indian 1121 golden sella basmati, extra-long grains that stay separate, first choice for restaurants and central kitchens.' },
  { slug: 'basmati-pakistan-super', ar: 'أرز بسمتي باكستاني سوبر كرنل', en: 'Pakistani Super Kernel basmati', cat: 'basmati-rice', brand: 'golden-grain', origin: 'PK', base: 7.9, units: [bag(20), bag(40)], moq: [10, 5], img: 'white rice grains', tags: [],
    specs: [spec('الصنف', 'Variety', 'سوبر كرنل', 'Super Kernel'), spec('التعتيق', 'Aging', '18 شهر', '18 months')],
    descAr: 'بسمتي باكستاني برائحة عطرية قوية وحبة ناعمة.', descEn: 'Aromatic Pakistani basmati with soft grains.' },
  { slug: 'mazza-rice-sella', ar: 'أرز مزة سيلا', en: 'Mazza sella rice', cat: 'sella-rice', brand: 'al-waha', origin: 'IN', base: 6.4, units: [bag(10), bag(40)], moq: [20, 5], img: 'rice bag', tags: ['best-seller'],
    specs: [spec('الاستخدام', 'Use', 'كبسة ومندي', 'Kabsa & mandi')], descAr: 'أرز مزة للكبسة السعودية.', descEn: 'Mazza rice for Saudi kabsa.' },
  { slug: 'egyptian-rice-medium', ar: 'أرز مصري حبة متوسطة', en: 'Egyptian medium-grain rice', cat: 'medium-grain-rice', brand: 'tamayoz', origin: 'EG', base: 4.8, units: [bag(5), bag(25)], moq: [20, 5], img: 'rice grains closeup', tags: [],
    specs: [spec('الحبة', 'Grain', 'متوسطة', 'Medium')], descAr: 'أرز مصري للمحاشي والأطباق اليومية.', descEn: 'Egyptian rice for stuffed dishes and daily meals.' },
  { slug: 'calrose-rice', ar: 'أرز كالروز', en: 'Calrose rice', cat: 'medium-grain-rice', brand: 'golden-grain', origin: 'US', base: 6.9, units: [bag(20)], moq: [5], img: 'rice bowl', tags: ['horeca'],
    specs: [spec('الاستخدام', 'Use', 'سوشي وحلويات', 'Sushi & desserts')], descAr: 'أرز كالروز أمريكي للمطاعم الآسيوية.', descEn: 'American Calrose rice for Asian restaurants.' },

  // ------------------------------------------------ grains & legumes
  { slug: 'red-lentils-split', ar: 'عدس أحمر مجروش', en: 'Red split lentils', cat: 'lentils', brand: 'sanabel', origin: 'CA', base: 5.2, units: [bag(25), ton], moq: [10, 1], img: 'red lentils', tags: ['bulk'],
    specs: [spec('النوع', 'Type', 'مجروش', 'Split')], descAr: 'عدس أحمر كندي مجروش للشوربة.', descEn: 'Canadian split red lentils for soup.' },
  { slug: 'brown-lentils-whole', ar: 'عدس بني حب', en: 'Whole brown lentils', cat: 'lentils', brand: 'sanabel', origin: 'CA', base: 5.8, units: [bag(25)], moq: [10], img: 'brown lentils', tags: [],
    specs: [spec('النوع', 'Type', 'حب كامل', 'Whole')], descAr: 'عدس بني كامل للطبخ.', descEn: 'Whole brown lentils for cooking.' },
  { slug: 'chickpeas-9mm', ar: 'حمص حب 9 مم', en: 'Chickpeas 9 mm', cat: 'chickpeas-beans', brand: 'sanabel', origin: 'MX', base: 6.3, units: [bag(25), ton], moq: [10, 1], img: 'chickpeas', featured: true, tags: ['bulk', 'best-seller'],
    specs: [spec('الحجم', 'Size', '9 مم', '9 mm')], descAr: 'حمص مكسيكي حبة كبيرة للحمص والفلافل.', descEn: 'Large Mexican chickpeas for hummus and falafel.' },
  { slug: 'fava-beans-dried', ar: 'فول مدمس ناشف', en: 'Dried fava beans', cat: 'chickpeas-beans', brand: 'tamayoz', origin: 'EG', base: 5.5, units: [bag(25)], moq: [10], img: 'fava beans', tags: [],
    specs: [spec('النوع', 'Type', 'بلدي', 'Baladi')], descAr: 'فول بلدي مصري لتحضير الفول المدمس.', descEn: 'Egyptian baladi fava beans for foul medames.' },
  { slug: 'bulgur-coarse', ar: 'برغل خشن', en: 'Coarse bulgur', cat: 'wheat-bulgur', brand: 'sanabel', origin: 'TR', base: 4.2, units: [bag(25)], moq: [10], img: 'bulgur wheat', tags: [],
    specs: [spec('الحجم', 'Grind', 'خشن', 'Coarse')], descAr: 'برغل تركي خشن.', descEn: 'Coarse Turkish bulgur.' },
  { slug: 'harees-wheat', ar: 'قمح هريس', en: 'Harees wheat', cat: 'wheat-bulgur', brand: 'sanabel', origin: 'SA', base: 4.9, units: [bag(10), bag(25)], moq: [10, 5], img: 'wheat grains', tags: ['ramadan'],
    specs: [spec('الاستخدام', 'Use', 'هريس وجريش', 'Harees & jareesh')], descAr: 'قمح مقشور للهريس والجريش.', descEn: 'Hulled wheat for harees and jareesh.' },

  // ------------------------------------------------ sugar, flour, salt
  { slug: 'white-sugar-fine', ar: 'سكر أبيض ناعم', en: 'Fine white sugar', cat: 'sugar', brand: 'hala', origin: 'SA', base: 3.1, units: [bag(10), bag(50), ton], moq: [20, 10, 1], img: 'white sugar', featured: true, tags: ['best-seller', 'bulk'],
    specs: [spec('الدرجة', 'Grade', 'ICUMSA 45', 'ICUMSA 45')], descAr: 'سكر أبيض ناعم مكرر بدرجة ICUMSA 45.', descEn: 'Refined fine white sugar, ICUMSA 45.' },
  { slug: 'brown-sugar', ar: 'سكر بني', en: 'Brown sugar', cat: 'sugar', brand: 'hala', origin: 'BR', base: 6.5, units: [bag(5), bag(25)], moq: [10, 4], img: 'brown sugar', tags: ['horeca'],
    specs: [spec('النوع', 'Type', 'قصب', 'Cane')], descAr: 'سكر قصب بني للمقاهي والحلويات.', descEn: 'Brown cane sugar for cafés and desserts.' },
  { slug: 'patent-flour-no1', ar: 'دقيق فاخر رقم 1', en: 'Patent flour No.1', cat: 'flour', brand: 'sanabel', origin: 'SA', base: 2.4, units: [bag(45), ton], moq: [20, 1], img: 'flour sack', featured: true, tags: ['bakery', 'bulk'],
    specs: [spec('البروتين', 'Protein', '11.5%', '11.5%'), spec('الاستخدام', 'Use', 'خبز ومعجنات', 'Bread & pastry')], descAr: 'دقيق أبيض فاخر للمخابز والمطابخ.', descEn: 'Premium white flour for bakeries and kitchens.' },
  { slug: 'whole-wheat-flour', ar: 'دقيق بر أسمر', en: 'Whole wheat flour', cat: 'flour', brand: 'sanabel', origin: 'SA', base: 2.9, units: [bag(10), bag(45)], moq: [20, 10], img: 'whole wheat flour', tags: ['bakery'],
    specs: [spec('النوع', 'Type', 'قمح كامل', 'Whole grain')], descAr: 'دقيق بر أسمر للخبز الصحي.', descEn: 'Whole wheat flour for healthy bread.' },
  { slug: 'table-salt-iodized', ar: 'ملح طعام مدعم باليود', en: 'Iodized table salt', cat: 'salt', brand: 'hala', origin: 'SA', base: 1.1, units: [carton(24, '700 جم', '700 g'), bag(25)], moq: [10, 10], img: 'salt crystals', tags: [],
    specs: [spec('الحجم', 'Size', '700 جم', '700 g')], descAr: 'ملح طعام ناعم مدعم باليود.', descEn: 'Fine iodized table salt.' },

  // ------------------------------------------------ oils & ghee
  { slug: 'sunflower-oil-18l', ar: 'زيت دوار الشمس 18 لتر', en: 'Sunflower oil 18 L', cat: 'vegetable-oil', brand: 'al-waha', origin: 'UA', base: 6.6, units: [{ code: 'CAN', ar: 'تنكة 18 لتر', en: '18 L tin', qty: 18, ...L }, carton(4, '4.5 لتر', '4.5 L', L)], moq: [10, 10], img: 'sunflower oil bottles', featured: true, tags: ['horeca', 'best-seller'],
    specs: [spec('الحجم', 'Size', '18 لتر', '18 L'), spec('النوع', 'Type', 'مكرر', 'Refined')], descAr: 'زيت دوار الشمس نقي للقلي والطبخ في المطاعم.', descEn: 'Pure sunflower oil for frying and cooking in restaurants.' },
  { slug: 'corn-oil-1-5l', ar: 'زيت ذرة 1.5 لتر', en: 'Corn oil 1.5 L', cat: 'vegetable-oil', brand: 'al-waha', origin: 'SA', base: 8.2, units: [carton(6, '1.5 لتر', '1.5 L', L)], moq: [10], img: 'cooking oil bottle', tags: [],
    specs: [spec('الحجم', 'Size', '1.5 لتر', '1.5 L')], descAr: 'زيت ذرة صحي للاستخدام المنزلي والتجزئة.', descEn: 'Healthy corn oil for retail.' },
  { slug: 'extra-virgin-olive-oil', ar: 'زيت زيتون بكر ممتاز', en: 'Extra virgin olive oil', cat: 'olive-oil', brand: 'zaytouna', origin: 'ES', base: 32, units: [carton(12, '1 لتر', '1 L', L), { code: 'CAN', ar: 'تنكة 5 لتر', en: '5 L tin', qty: 5, ...L }], img: 'olive oil bottle', featured: true, tags: ['premium'],
    specs: [spec('الحموضة', 'Acidity', 'أقل من 0.5%', '<0.5%'), spec('العصر', 'Press', 'عصرة أولى على البارد', 'First cold press')], descAr: 'زيت زيتون إسباني بكر ممتاز.', descEn: 'Spanish extra virgin olive oil.' },
  { slug: 'pure-cow-ghee', ar: 'سمن بقري طبيعي', en: 'Pure cow ghee', cat: 'ghee', brand: 'badia-ghee', origin: 'SA', base: 42, units: [carton(12, '800 جم', '800 g', { baseAr: 'عبوة', baseEn: 'jar' }), { code: 'CAN', ar: 'تنكة 16 كجم', en: '16 kg tin', qty: 16, ...KG }], img: 'ghee butter jar', tags: ['best-seller'],
    specs: [spec('المصدر', 'Source', 'حليب بقري', 'Cow milk')], descAr: 'سمن بقري بلدي نقي 100%.', descEn: '100% pure cow ghee.' },
  { slug: 'vegetable-ghee-16kg', ar: 'سمن نباتي 16 كجم', en: 'Vegetable ghee 16 kg', cat: 'ghee', brand: 'badia-ghee', origin: 'MY', base: 7.8, units: [{ code: 'CAN', ar: 'تنكة 16 كجم', en: '16 kg tin', qty: 16, ...KG }], moq: [5], img: 'vegetable ghee', tags: ['bakery', 'horeca'],
    specs: [spec('الحجم', 'Size', '16 كجم', '16 kg')], descAr: 'سمن نباتي للمخابز والحلويات.', descEn: 'Vegetable ghee for bakeries and sweets.' },

  // ------------------------------------------------ canned
  { slug: 'tuna-chunks-sunflower', ar: 'تونة قطع بزيت دوار الشمس', en: 'Tuna chunks in sunflower oil', cat: 'tuna', brand: 'arabian-sea', origin: 'TH', base: 5.4, units: [carton(48, '185 جم', '185 g', { baseAr: 'علبة', baseEn: 'can' })], moq: [5], img: 'canned tuna', featured: true, tags: ['best-seller'],
    specs: [spec('الوزن', 'Weight', '185 جم', '185 g')], descAr: 'تونة خفيفة قطع بزيت دوار الشمس.', descEn: 'Light tuna chunks in sunflower oil.' },
  { slug: 'tuna-solid-white', ar: 'تونة بيضاء قطعة واحدة', en: 'Solid white tuna', cat: 'tuna', brand: 'arabian-sea', origin: 'TH', base: 8.9, units: [carton(24, '160 جم', '160 g', { baseAr: 'علبة', baseEn: 'can' })], moq: [3], img: 'tuna can', tags: ['premium'],
    specs: [spec('النوع', 'Type', 'ألباكور', 'Albacore')], descAr: 'تونة بيضاء فاخرة.', descEn: 'Premium solid white tuna.' },
  { slug: 'fava-beans-canned', ar: 'فول مدمس معلب', en: 'Canned fava beans', cat: 'canned-vegetables', brand: 'tamayoz', origin: 'EG', base: 2.1, units: [carton(24, '400 جم', '400 g', { baseAr: 'علبة', baseEn: 'can' })], moq: [5], img: 'canned beans', tags: ['best-seller'],
    specs: [spec('الوزن', 'Weight', '400 جم', '400 g')], descAr: 'فول مدمس جاهز.', descEn: 'Ready foul medames.' },
  { slug: 'sweet-corn-canned', ar: 'ذرة حلوة معلبة', en: 'Canned sweet corn', cat: 'canned-vegetables', brand: 'tamayoz', origin: 'TH', base: 3.2, units: [carton(24, '340 جم', '340 g', { baseAr: 'علبة', baseEn: 'can' })], moq: [3], img: 'sweet corn', tags: [],
    specs: [spec('الوزن', 'Weight', '340 جم', '340 g')], descAr: 'ذرة حلوة حبوب كاملة.', descEn: 'Whole-kernel sweet corn.' },
  { slug: 'tomato-paste-400g', ar: 'معجون طماطم 400 جم', en: 'Tomato paste 400 g', cat: 'tomato-paste', brand: 'tamayoz', origin: 'TR', base: 2.6, units: [carton(24, '400 جم', '400 g', { baseAr: 'علبة', baseEn: 'can' }), { code: 'CAN', ar: 'علبة 4.5 كجم', en: '4.5 kg tin', qty: 1, ...PC }], moq: [5, 12], img: 'tomato paste', featured: true, tags: ['horeca'],
    specs: [spec('التركيز', 'Brix', '28-30%', '28-30%')], descAr: 'معجون طماطم مركز.', descEn: 'Concentrated tomato paste.' },

  // ------------------------------------------------ beverages
  { slug: 'water-330ml', ar: 'مياه شرب معبأة 330 مل', en: 'Bottled water 330 ml', cat: 'water', brand: 'najd-springs', origin: 'SA', base: 0.42, units: [carton(40, '330 مل', '330 ml', { baseAr: 'قارورة', baseEn: 'bottle' }), { code: 'PALLET', ar: 'طبلية 84 كرتون', en: 'Pallet of 84 cartons', qty: 3360, baseAr: 'قارورة', baseEn: 'bottle' }], moq: [10, 1], img: 'water bottles', featured: true, tags: ['best-seller', 'horeca'],
    specs: [spec('الحجم', 'Size', '330 مل', '330 ml'), spec('الأس الهيدروجيني', 'pH', '7.4', '7.4')], descAr: 'مياه شرب نقية بحجم مناسب للمطاعم والمكاتب.', descEn: 'Pure drinking water sized for restaurants and offices.' },
  { slug: 'water-1-5l', ar: 'مياه شرب 1.5 لتر', en: 'Bottled water 1.5 L', cat: 'water', brand: 'najd-springs', origin: 'SA', base: 0.95, units: [carton(12, '1.5 لتر', '1.5 L', { baseAr: 'قارورة', baseEn: 'bottle' })], moq: [10], img: 'large water bottle', tags: [],
    specs: [spec('الحجم', 'Size', '1.5 لتر', '1.5 L')], descAr: 'مياه شرب عائلية.', descEn: 'Family-size water.' },
  { slug: 'orange-juice-1l', ar: 'عصير برتقال طبيعي 1 لتر', en: 'Natural orange juice 1 L', cat: 'juices', brand: 'fresha', origin: 'SA', base: 5.9, units: [carton(12, '1 لتر', '1 L', { baseAr: 'عبوة', baseEn: 'pack' })], moq: [5], img: 'orange juice', storage: 'CHILLED', tags: ['best-seller'],
    specs: [spec('المحتوى', 'Content', '100% عصير', '100% juice')], descAr: 'عصير برتقال طبيعي بدون سكر مضاف.', descEn: 'Natural orange juice, no added sugar.' },
  { slug: 'mango-nectar-250ml', ar: 'شراب مانجو 250 مل', en: 'Mango nectar 250 ml', cat: 'juices', brand: 'fresha', origin: 'SA', base: 0.85, units: [carton(24, '250 مل', '250 ml', { baseAr: 'عبوة', baseEn: 'pack' })], moq: [10], img: 'mango juice', tags: [],
    specs: [spec('الحجم', 'Size', '250 مل', '250 ml')], descAr: 'شراب مانجو للمقاصف والمدارس.', descEn: 'Mango nectar for canteens and schools.' },
  { slug: 'cola-can-330ml', ar: 'مشروب كولا غازي 330 مل', en: 'Cola soft drink 330 ml', cat: 'soft-drinks', brand: 'fizzo', origin: 'SA', base: 1.35, units: [carton(24, '330 مل', '330 ml', { baseAr: 'علبة', baseEn: 'can' })], moq: [10], img: 'soda cans', featured: true, tags: ['best-seller'],
    specs: [spec('الحجم', 'Size', '330 مل', '330 ml')], descAr: 'مشروب كولا منعش.', descEn: 'Refreshing cola drink.' },
  { slug: 'lemon-lime-can', ar: 'مشروب ليمون غازي 330 مل', en: 'Lemon-lime soda 330 ml', cat: 'soft-drinks', brand: 'fizzo', origin: 'SA', base: 1.3, units: [carton(24, '330 مل', '330 ml', { baseAr: 'علبة', baseEn: 'can' })], moq: [10], img: 'lemon soda', tags: [],
    specs: [spec('الحجم', 'Size', '330 مل', '330 ml')], descAr: 'مشروب ليمون منعش.', descEn: 'Refreshing lemon-lime soda.' },

  // ------------------------------------------------ dairy (chilled)
  { slug: 'full-fat-milk-1l', ar: 'حليب طازج كامل الدسم 1 لتر', en: 'Fresh full-fat milk 1 L', cat: 'milk', brand: 'bashayer', origin: 'SA', base: 5.2, units: [carton(12, '1 لتر', '1 L', { baseAr: 'عبوة', baseEn: 'pack' })], moq: [5], img: 'milk bottles', storage: 'CHILLED', featured: true, tags: ['best-seller', 'horeca'],
    specs: [spec('الدسم', 'Fat', '3%', '3%')], descAr: 'حليب طازج يومي من مزارع سعودية.', descEn: 'Daily fresh milk from Saudi farms.' },
  { slug: 'uht-milk-200ml', ar: 'حليب طويل الأجل 200 مل', en: 'UHT milk 200 ml', cat: 'milk', brand: 'bashayer', origin: 'SA', base: 1.1, units: [carton(36, '200 مل', '200 ml', { baseAr: 'عبوة', baseEn: 'pack' })], moq: [10], img: 'milk carton', tags: [],
    specs: [spec('الصلاحية', 'Shelf life', '9 أشهر', '9 months')], descAr: 'حليب معقم طويل الأجل.', descEn: 'Long-life UHT milk.' },
  { slug: 'mozzarella-block', ar: 'جبنة موزاريلا قالب', en: 'Mozzarella block', cat: 'cheese', brand: 'bashayer', origin: 'DE', base: 24, units: [{ code: 'PIECE', ar: 'قالب 2.3 كجم', en: '2.3 kg block', qty: 2.3, ...KG }, box(18.4, 'كرتون 8 قوالب', 'Carton of 8 blocks', KG)], moq: [4, 1], img: 'mozzarella cheese', storage: 'CHILLED', featured: true, tags: ['horeca', 'pizza'],
    specs: [spec('الدسم', 'Fat', '45%', '45%')], descAr: 'موزاريلا للبيتزا بقابلية تمطط عالية.', descEn: 'Pizza mozzarella with great stretch.' },
  { slug: 'white-cheese-feta', ar: 'جبنة بيضاء فيتا', en: 'White feta cheese', cat: 'cheese', brand: 'bashayer', origin: 'SA', base: 18, units: [carton(6, '1 كجم', '1 kg', KG)], moq: [3], img: 'feta cheese', storage: 'CHILLED', tags: [],
    specs: [spec('النوع', 'Type', 'فيتا', 'Feta')], descAr: 'جبنة فيتا طرية.', descEn: 'Soft feta cheese.' },
  { slug: 'laban-1l', ar: 'لبن طازج 1 لتر', en: 'Fresh laban 1 L', cat: 'laban-yogurt', brand: 'bashayer', origin: 'SA', base: 4.6, units: [carton(12, '1 لتر', '1 L', { baseAr: 'عبوة', baseEn: 'pack' })], moq: [5], img: 'yogurt drink', storage: 'CHILLED', tags: [],
    specs: [spec('الدسم', 'Fat', '2.5%', '2.5%')], descAr: 'لبن طازج يومي.', descEn: 'Daily fresh laban.' },
  { slug: 'greek-yogurt-2kg', ar: 'زبادي يوناني 2 كجم', en: 'Greek yogurt 2 kg', cat: 'laban-yogurt', brand: 'bashayer', origin: 'SA', base: 11, units: [{ code: 'TRAY', ar: 'سطل 2 كجم', en: '2 kg tub', qty: 2, ...KG }], moq: [6], img: 'greek yogurt', storage: 'CHILLED', tags: ['horeca'],
    specs: [spec('البروتين', 'Protein', '10%', '10%')], descAr: 'زبادي يوناني كثيف للمطاعم.', descEn: 'Thick Greek yogurt for restaurants.' },

  // ------------------------------------------------ frozen
  { slug: 'whole-chicken-1000g', ar: 'دجاج كامل مجمد 1000 جم', en: 'Frozen whole chicken 1000 g', cat: 'frozen-chicken', brand: 'safwa-poultry', origin: 'SA', base: 12.5, units: [carton(10, '1000 جم', '1000 g', { baseAr: 'دجاجة', baseEn: 'bird' })], moq: [10], img: 'frozen chicken', storage: 'FROZEN', featured: true, tags: ['best-seller', 'horeca'],
    specs: [spec('الوزن', 'Weight', '1000 جم', '1000 g'), spec('الذبح', 'Slaughter', 'حلال', 'Halal')], descAr: 'دجاج سعودي كامل مجمد مذبوح حلال.', descEn: 'Halal Saudi frozen whole chicken.' },
  { slug: 'chicken-breast-boneless', ar: 'صدور دجاج بدون عظم مجمدة', en: 'Frozen boneless chicken breast', cat: 'frozen-chicken', brand: 'safwa-poultry', origin: 'BR', base: 17, units: [box(10, 'كرتون 10 كجم', '10 kg carton', KG)], moq: [5], img: 'chicken breast', storage: 'FROZEN', tags: ['horeca'],
    specs: [spec('التجميد', 'Freezing', 'IQF', 'IQF')], descAr: 'صدور دجاج مجمدة بتقنية IQF.', descEn: 'IQF frozen chicken breasts.' },
  { slug: 'lamb-carcass-frozen', ar: 'ذبيحة لحم ضأن مجمدة', en: 'Frozen lamb carcass', cat: 'frozen-meat', brand: 'north-pastures', origin: 'AU', base: 29, units: [box(18, 'ذبيحة ~18 كجم', 'Carcass ~18 kg', KG)], moq: [5], img: 'lamb meat', storage: 'FROZEN', featured: true, tags: ['horeca'],
    specs: [spec('المنشأ', 'Origin', 'أستراليا', 'Australia'), spec('الذبح', 'Slaughter', 'حلال', 'Halal')], descAr: 'لحم ضأن أسترالي حلال مجمد للمطاعم والمندي.', descEn: 'Halal frozen Australian lamb for restaurants and mandi.' },
  { slug: 'beef-mince-frozen', ar: 'لحم بقري مفروم مجمد', en: 'Frozen beef mince', cat: 'frozen-meat', brand: 'north-pastures', origin: 'IN', base: 21, units: [box(10, 'كرتون 10 كجم', '10 kg carton', KG)], moq: [5], img: 'minced beef', storage: 'FROZEN', tags: ['burger'],
    specs: [spec('الدهون', 'Fat', '15%', '15%')], descAr: 'لحم بقري مفروم للبرجر والمعجنات.', descEn: 'Beef mince for burgers and pastries.' },
  { slug: 'french-fries-frozen', ar: 'بطاطس مقلية مجمدة 9 مم', en: 'Frozen french fries 9 mm', cat: 'frozen-vegetables', brand: 'north-pastures', origin: 'BE', base: 6.8, units: [carton(4, '2.5 كجم', '2.5 kg', KG)], moq: [10], img: 'french fries', storage: 'FROZEN', featured: true, tags: ['horeca', 'best-seller'],
    specs: [spec('القطع', 'Cut', '9 مم مستقيم', '9 mm straight')], descAr: 'بطاطس بلجيكية مجمدة مقرمشة للمطاعم.', descEn: 'Crispy Belgian frozen fries for restaurants.' },
  { slug: 'mixed-vegetables-frozen', ar: 'خضار مشكلة مجمدة', en: 'Frozen mixed vegetables', cat: 'frozen-vegetables', brand: 'tamayoz', origin: 'EG', base: 5.2, units: [carton(10, '1 كجم', '1 kg', KG)], moq: [5], img: 'frozen vegetables', storage: 'FROZEN', tags: [],
    specs: [spec('المحتوى', 'Mix', 'جزر، بازلاء، ذرة، فاصوليا', 'Carrot, peas, corn, beans')], descAr: 'خضار مشكلة مجمدة.', descEn: 'Frozen mixed vegetables.' },

  // ------------------------------------------------ spices
  { slug: 'green-cardamom-8mm', ar: 'هيل أخضر حب 8 مم', en: 'Green cardamom 8 mm', cat: 'saffron-cardamom', brand: 'al-reem', origin: 'GT', base: 145, units: [bag(1), box(10, 'كرتون 10 كجم', '10 kg carton', KG)], img: 'green cardamom', featured: true, tags: ['premium', 'best-seller'],
    specs: [spec('الحجم', 'Size', '8 مم', '8 mm'), spec('المنشأ', 'Origin', 'جواتيمالا', 'Guatemala')], descAr: 'هيل أخضر جواتيمالي فاخر للقهوة العربية.', descEn: 'Premium Guatemalan green cardamom for Arabic coffee.' },
  { slug: 'saffron-super-negin', ar: 'زعفران سوبر نقين', en: 'Super Negin saffron', cat: 'saffron-cardamom', brand: 'al-reem', origin: 'ES', base: 9.5, units: [box(10, 'علبة 10 جرام', '10 g tin', { baseAr: 'جرام', baseEn: 'gram' })], img: 'saffron threads', tags: ['premium'],
    specs: [spec('الدرجة', 'Grade', 'سوبر نقين', 'Super Negin')], descAr: 'زعفران شعيرات حمراء نقية.', descEn: 'Pure red saffron threads.' },
  { slug: 'black-pepper-whole', ar: 'فلفل أسود حب', en: 'Whole black pepper', cat: 'whole-spices', brand: 'al-reem', origin: 'VN', base: 34, units: [bag(1), box(10, 'كيس 10 كجم', '10 kg bag', KG)], img: 'black pepper', tags: [],
    specs: [spec('الكثافة', 'Density', '550 جم/لتر', '550 g/L')], descAr: 'فلفل أسود فيتنامي.', descEn: 'Vietnamese black pepper.' },
  { slug: 'kabsa-spice-mix', ar: 'بهارات كبسة', en: 'Kabsa spice mix', cat: 'ground-spices', brand: 'al-reem', origin: 'SA', base: 38, units: [carton(12, '500 جم', '500 g', { baseAr: 'عبوة', baseEn: 'pack' }), bag(5)], img: 'spice mix powder', featured: true, tags: ['best-seller', 'horeca'],
    specs: [spec('الاستخدام', 'Use', 'كبسة ومندي', 'Kabsa & mandi')], descAr: 'خلطة بهارات كبسة سعودية أصلية.', descEn: 'Authentic Saudi kabsa spice blend.' },
  { slug: 'turmeric-powder', ar: 'كركم مطحون', en: 'Ground turmeric', cat: 'ground-spices', brand: 'al-reem', origin: 'IN', base: 16, units: [bag(1), box(25, 'كيس 25 كجم', '25 kg bag', KG)], img: 'turmeric powder', tags: [],
    specs: [spec('الكركمين', 'Curcumin', '3%', '3%')], descAr: 'كركم هندي مطحون.', descEn: 'Indian ground turmeric.' },

  // ------------------------------------------------ cleaning
  { slug: 'laundry-powder-auto', ar: 'مسحوق غسيل أوتوماتيك', en: 'Automatic laundry powder', cat: 'detergents', brand: 'naqaa', origin: 'SA', base: 7.4, units: [carton(4, '4.5 كجم', '4.5 kg', KG), bag(25)], img: 'laundry detergent', tags: ['best-seller'],
    specs: [spec('النوع', 'Type', 'أوتوماتيك', 'Automatic')], descAr: 'مسحوق غسيل للغسالات الأوتوماتيكية.', descEn: 'Laundry powder for automatic machines.' },
  { slug: 'floor-cleaner-4l', ar: 'منظف أرضيات 4 لتر', en: 'Floor cleaner 4 L', cat: 'detergents', brand: 'naqaa', origin: 'SA', base: 3.1, units: [carton(4, '4 لتر', '4 L', L)], moq: [5], img: 'floor cleaner', tags: ['horeca'],
    specs: [spec('الرائحة', 'Scent', 'لافندر', 'Lavender')], descAr: 'منظف ومعطر أرضيات للمنشآت.', descEn: 'Floor cleaner and freshener for facilities.' },
  { slug: 'dishwash-liquid-5l', ar: 'سائل جلي 5 لتر', en: 'Dishwashing liquid 5 L', cat: 'dishwash', brand: 'naqaa', origin: 'SA', base: 3.6, units: [carton(4, '5 لتر', '5 L', L)], moq: [5], img: 'dish soap', featured: true, tags: ['horeca'],
    specs: [spec('الرائحة', 'Scent', 'ليمون', 'Lemon')], descAr: 'سائل جلي مركز للمطابخ التجارية.', descEn: 'Concentrated dishwashing liquid for commercial kitchens.' },
  { slug: 'facial-tissues-box', ar: 'مناديل وجه 200 منديل', en: 'Facial tissues 200 sheets', cat: 'tissues', brand: 'safi', origin: 'SA', base: 2.4, units: [carton(30, 'علبة 200', '200-sheet box')], moq: [5], img: 'tissue boxes', tags: ['best-seller'],
    specs: [spec('الطبقات', 'Ply', 'طبقتان', '2-ply')], descAr: 'مناديل وجه ناعمة.', descEn: 'Soft facial tissues.' },
  { slug: 'kitchen-roll-jumbo', ar: 'رول مطبخ جامبو', en: 'Jumbo kitchen roll', cat: 'tissues', brand: 'safi', origin: 'SA', base: 9.5, units: [carton(6, 'رول جامبو', 'jumbo roll')], moq: [5], img: 'paper towel roll', tags: ['horeca'],
    specs: [spec('الطول', 'Length', '300 م', '300 m')], descAr: 'رول ورق مطبخ للمطاعم.', descEn: 'Kitchen paper roll for restaurants.' },

  // ------------------------------------------------ HoReCa
  { slug: 'paper-cup-8oz', ar: 'كوب ورقي 8 أونصة', en: 'Paper cup 8 oz', cat: 'cups', brand: 'packpro', origin: 'CN', base: 0.14, units: [carton(1000, '50 كوب', '50 cups')], moq: [5], img: 'paper coffee cups', featured: true, tags: ['horeca', 'best-seller'],
    specs: [spec('الحجم', 'Size', '8 أونصة', '8 oz'), spec('الجدار', 'Wall', 'مزدوج', 'Double wall')], descAr: 'أكواب ورقية مزدوجة الجدار للمشروبات الساخنة.', descEn: 'Double-wall paper cups for hot drinks.' },
  { slug: 'paper-cup-12oz-lid', ar: 'كوب ورقي 12 أونصة مع غطاء', en: 'Paper cup 12 oz with lid', cat: 'cups', brand: 'packpro', origin: 'CN', base: 0.24, units: [carton(500, '500 كوب', '500 cups')], moq: [5], img: 'coffee cup lid', tags: ['horeca'],
    specs: [spec('الحجم', 'Size', '12 أونصة', '12 oz')], descAr: 'أكواب 12 أونصة مع أغطية.', descEn: '12 oz cups with lids.' },
  { slug: 'food-container-750ml', ar: 'علبة طعام بلاستيك 750 مل', en: 'Plastic food container 750 ml', cat: 'food-containers', brand: 'packpro', origin: 'SA', base: 0.38, units: [carton(300, '300 علبة', '300 pcs')], moq: [5], img: 'takeaway food containers', tags: ['horeca', 'best-seller'],
    specs: [spec('المادة', 'Material', 'PP آمن للميكروويف', 'Microwave-safe PP')], descAr: 'علب حفظ طعام للتيك أواي.', descEn: 'Takeaway food containers.' },
  { slug: 'aluminium-container-8342', ar: 'صحن ألمنيوم 8342 مع غطاء', en: 'Aluminium container 8342 with lid', cat: 'food-containers', brand: 'packpro', origin: 'SA', base: 0.52, units: [carton(500, '500 قطعة', '500 pcs')], moq: [3], img: 'aluminium foil container', tags: ['horeca'],
    specs: [spec('المقاس', 'Size', '8342', '8342')], descAr: 'صحون ألمنيوم للمندي والكبسة.', descEn: 'Aluminium trays for mandi and kabsa.' },
  { slug: 'nitrile-gloves', ar: 'قفازات نيتريل', en: 'Nitrile gloves', cat: 'gloves-wraps', brand: 'packpro', origin: 'MY', base: 0.18, units: [box(100, 'علبة 100 قفاز', 'Box of 100'), carton(1000, '10 علب', '10 boxes')], moq: [10, 1], img: 'nitrile gloves', tags: ['horeca'],
    specs: [spec('المقاس', 'Size', 'M / L', 'M / L')], descAr: 'قفازات نيتريل بدون بودرة للمطابخ.', descEn: 'Powder-free nitrile gloves for kitchens.' },
  { slug: 'cling-film-roll', ar: 'رول نايلون تغليف 45 سم', en: 'Cling film roll 45 cm', cat: 'gloves-wraps', brand: 'packpro', origin: 'SA', base: 38, units: [carton(6, 'رول 45 سم', '45 cm roll')], moq: [2], img: 'plastic wrap roll', tags: ['horeca'],
    specs: [spec('الطول', 'Length', '300 م', '300 m')], descAr: 'رول نايلون تغليف غذائي.', descEn: 'Food-grade cling film roll.' },
];

/** Hero/banner/blog imagery queries (Openverse). */
export const MEDIA_EXTRA: { key: string; query: string }[] = [
  { key: 'hero-warehouse', query: 'warehouse pallets logistics' },
  { key: 'hero-truck', query: 'delivery truck highway' },
  { key: 'hero-market', query: 'grocery store shelves' },
  { key: 'banner-coffee', query: 'coffee roastery beans' },
  { key: 'banner-dates', query: 'dates palm tree harvest' },
  { key: 'banner-horeca', query: 'restaurant kitchen chef' },
  { key: 'banner-rice', query: 'rice field harvest' },
  { key: 'banner-delivery', query: 'cargo truck loading' },
  { key: 'blog-1', query: 'restaurant inventory storage' },
  { key: 'blog-2', query: 'cafe barista espresso' },
  { key: 'blog-3', query: 'supermarket aisle' },
  { key: 'blog-4', query: 'business accounting calculator' },
  { key: 'blog-5', query: 'frozen food storage' },
  { key: 'blog-6', query: 'spice market' },
];
