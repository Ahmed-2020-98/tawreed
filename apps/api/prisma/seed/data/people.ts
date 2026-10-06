/** Seed people, places and organisations. Phones are fictional; dev OTP is 123456. */

export const REGIONS = [
  { code: 'RIYADH', ar: 'منطقة الرياض', en: 'Riyadh Region' },
  { code: 'MAKKAH', ar: 'منطقة مكة المكرمة', en: 'Makkah Region' },
  { code: 'MADINAH', ar: 'منطقة المدينة المنورة', en: 'Madinah Region' },
  { code: 'EASTERN', ar: 'المنطقة الشرقية', en: 'Eastern Province' },
  { code: 'QASSIM', ar: 'منطقة القصيم', en: 'Qassim Region' },
  { code: 'HAIL', ar: 'منطقة حائل', en: 'Hail Region' },
  { code: 'ASIR', ar: 'منطقة عسير', en: 'Asir Region' },
  { code: 'TABUK', ar: 'منطقة تبوك', en: 'Tabuk Region' },
];

export const CITIES = [
  { slug: 'riyadh', region: 'RIYADH', ar: 'الرياض', en: 'Riyadh', lat: 24.7136, lng: 46.6753 },
  { slug: 'kharj', region: 'RIYADH', ar: 'الخرج', en: 'Al Kharj', lat: 24.1556, lng: 47.3346 },
  { slug: 'jeddah', region: 'MAKKAH', ar: 'جدة', en: 'Jeddah', lat: 21.4858, lng: 39.1925 },
  { slug: 'makkah', region: 'MAKKAH', ar: 'مكة المكرمة', en: 'Makkah', lat: 21.3891, lng: 39.8579 },
  { slug: 'taif', region: 'MAKKAH', ar: 'الطائف', en: 'Taif', lat: 21.2854, lng: 40.4146 },
  { slug: 'madinah', region: 'MADINAH', ar: 'المدينة المنورة', en: 'Madinah', lat: 24.5247, lng: 39.5692 },
  { slug: 'dammam', region: 'EASTERN', ar: 'الدمام', en: 'Dammam', lat: 26.4207, lng: 50.0888 },
  { slug: 'khobar', region: 'EASTERN', ar: 'الخبر', en: 'Al Khobar', lat: 26.2172, lng: 50.1971 },
  { slug: 'ahsa', region: 'EASTERN', ar: 'الأحساء', en: 'Al Ahsa', lat: 25.3833, lng: 49.5859 },
  { slug: 'jubail', region: 'EASTERN', ar: 'الجبيل', en: 'Jubail', lat: 27.0046, lng: 49.6460 },
  { slug: 'buraydah', region: 'QASSIM', ar: 'بريدة', en: 'Buraydah', lat: 26.3592, lng: 43.9818 },
  { slug: 'unaizah', region: 'QASSIM', ar: 'عنيزة', en: 'Unaizah', lat: 26.0843, lng: 43.9935 },
  { slug: 'hail', region: 'HAIL', ar: 'حائل', en: 'Hail', lat: 27.5114, lng: 41.7208 },
  { slug: 'abha', region: 'ASIR', ar: 'أبها', en: 'Abha', lat: 18.2465, lng: 42.5117 },
  { slug: 'tabuk', region: 'TABUK', ar: 'تبوك', en: 'Tabuk', lat: 28.3835, lng: 36.5662 },
];

export const STAFF = [
  { name: 'مدير المنصة', email: 'admin@tawreed.test', roles: ['SUPER_ADMIN'], title: 'مدير عام' },
  { name: 'نورة المالية', email: 'finance@tawreed.test', roles: ['FINANCE', 'CREDIT_MANAGER'], title: 'مديرة المالية والائتمان' },
  { name: 'فهد العمليات', email: 'ops@tawreed.test', roles: ['OPERATIONS', 'LOGISTICS'], title: 'مدير العمليات' },
  { name: 'سارة الكتالوج', email: 'catalog@tawreed.test', roles: ['CATALOG_MANAGER', 'MARKETING'], title: 'مديرة الكتالوج والتسويق' },
  { name: 'خالد الدعم', email: 'support@tawreed.test', roles: ['SUPPORT'], title: 'خدمة العملاء' },
];

export interface SeedSupplier {
  slug: string;
  ar: string;
  en: string;
  legal: string;
  city: string;
  color: string;
  commission: number;
  minOrder: number;
  fleet: 'OWN' | 'PLATFORM' | 'BOTH';
  rating: number;
  ratingCount: number;
  featured: boolean;
  founded: number;
  owner: { name: string; phone: string };
  categories: string[];
  /** Share of eligible products offered (0-1). */
  share: number;
  priceFactor: number;
  coverage: { city: string; fee: number; free: number | null; lead: number; sameDay?: boolean }[];
  warehouse: { name: string; district: string; lat: number; lng: number };
  descAr: string;
  descEn: string;
  cr: string;
  vat: string;
}

export const SUPPLIERS: SeedSupplier[] = [
  {
    slug: 'al-waha-foods', ar: 'شركة الواحة للمواد الغذائية', en: 'Al Waha Foods Co.', legal: 'شركة الواحة للمواد الغذائية المحدودة', city: 'riyadh', color: '#0A9B69', commission: 0.04, minOrder: 500, fleet: 'OWN', rating: 4.7, ratingCount: 318, featured: true, founded: 2004,
    owner: { name: 'سعد الدوسري', phone: '+966500000101' }, categories: ['rice', 'grains-legumes', 'sugar-flour', 'oils-ghee', 'canned-food', 'bulk-dates', 'date-products', 'ground-spices'], share: 0.85, priceFactor: 1.0,
    coverage: [{ city: 'riyadh', fee: 35, free: 1500, lead: 1, sameDay: true }, { city: 'kharj', fee: 60, free: 3000, lead: 1 }, { city: 'buraydah', fee: 120, free: 6000, lead: 2 }, { city: 'jeddah', fee: 140, free: 8000, lead: 3 }],
    warehouse: { name: 'مستودع السلي', district: 'السلي', lat: 24.6085, lng: 46.8329 },
    descAr: 'موزع رائد للمواد الغذائية الجافة في المنطقة الوسطى منذ 2004، أسطول توصيل خاص وتوريد يومي للمطاعم والأسواق.', descEn: 'Leading dry-food distributor in the Central Region since 2004 with its own fleet and daily supply to restaurants and markets.', cr: '1010234561', vat: '310123456700003',
  },
  {
    slug: 'qassim-palms-dates', ar: 'مؤسسة نخيل القصيم للتمور', en: 'Qassim Palms Dates Est.', legal: 'مؤسسة نخيل القصيم للتمور', city: 'buraydah', color: '#7A4B1E', commission: 0.05, minOrder: 800, fleet: 'BOTH', rating: 4.9, ratingCount: 204, featured: true, founded: 1998,
    owner: { name: 'عبدالرحمن الحربي', phone: '+966500000102' }, categories: ['dates'], share: 1, priceFactor: 0.98,
    coverage: [{ city: 'buraydah', fee: 25, free: 1000, lead: 1, sameDay: true }, { city: 'unaizah', fee: 35, free: 1500, lead: 1 }, { city: 'riyadh', fee: 90, free: 4000, lead: 2 }, { city: 'hail', fee: 110, free: 5000, lead: 2 }, { city: 'madinah', fee: 140, free: 6000, lead: 3 }],
    warehouse: { name: 'مستودعات سوق التمور', district: 'الصفراء', lat: 26.3655, lng: 43.9401 },
    descAr: 'مزارع ومصانع تعبئة تمور في القصيم، سكري وخلاص وصقعي بجودة تصدير وتعبئة حسب الطلب.', descEn: 'Qassim date farms and packing plants: export-grade Sukkari, Khalas and Segai with custom packing.', cr: '1131045678', vat: '310234567800003',
  },
  {
    slug: 'jazeera-coffee-trading', ar: 'بن الجزيرة للتجارة', en: 'Jazeera Coffee Trading', legal: 'شركة بن الجزيرة للتجارة', city: 'jeddah', color: '#5B3A29', commission: 0.05, minOrder: 600, fleet: 'PLATFORM', rating: 4.8, ratingCount: 156, featured: true, founded: 2011,
    owner: { name: 'ماجد الغامدي', phone: '+966500000103' }, categories: ['coffee-tea', 'spices'], share: 1, priceFactor: 1.02,
    coverage: [{ city: 'jeddah', fee: 30, free: 1500, lead: 1, sameDay: true }, { city: 'makkah', fee: 45, free: 2000, lead: 1 }, { city: 'madinah', fee: 90, free: 4000, lead: 2 }, { city: 'riyadh', fee: 110, free: 5000, lead: 2 }, { city: 'dammam', fee: 130, free: 6000, lead: 3 }],
    warehouse: { name: 'محمصة ومستودع الخمرة', district: 'الخمرة', lat: 21.4031, lng: 39.2288 },
    descAr: 'مستورد ومحمصة بن مختص يخدم المقاهي والمحامص في المملكة، مع هيل وزعفران وبهارات فاخرة.', descEn: 'Specialty coffee importer and roaster serving cafés and roasters nationwide, plus premium cardamom, saffron and spices.', cr: '4030156789', vat: '310345678900003',
  },
  {
    slug: 'golden-grain-group', ar: 'مجموعة الأرز الذهبي', en: 'Golden Grain Group', legal: 'مجموعة الأرز الذهبي التجارية', city: 'dammam', color: '#C9A227', commission: 0.035, minOrder: 1000, fleet: 'OWN', rating: 4.6, ratingCount: 241, featured: true, founded: 2008,
    owner: { name: 'تركي الشمري', phone: '+966500000104' }, categories: ['rice', 'grains-legumes', 'sugar-flour'], share: 0.9, priceFactor: 0.97,
    coverage: [{ city: 'dammam', fee: 30, free: 2000, lead: 1, sameDay: true }, { city: 'khobar', fee: 35, free: 2000, lead: 1 }, { city: 'ahsa', fee: 70, free: 4000, lead: 1 }, { city: 'jubail', fee: 70, free: 4000, lead: 2 }, { city: 'riyadh', fee: 120, free: 7000, lead: 2 }, { city: 'jeddah', fee: 160, free: 9000, lead: 3 }],
    warehouse: { name: 'مستودع المدينة الصناعية الثانية', district: 'الصناعية الثانية', lat: 26.3450, lng: 50.1510 },
    descAr: 'مستورد أرز وحبوب بالجملة بالشاحنات والحاويات، أسعار تنافسية للكميات الكبيرة.', descEn: 'Wholesale importer of rice and grains by truckload and container with competitive bulk pricing.', cr: '2050178901', vat: '310456789000003',
  },
  {
    slug: 'cold-pastures', ar: 'شركة المراعي الباردة للتوزيع', en: 'Cold Pastures Distribution', legal: 'شركة المراعي الباردة للتوزيع', city: 'riyadh', color: '#2F855A', commission: 0.045, minOrder: 700, fleet: 'OWN', rating: 4.5, ratingCount: 132, featured: false, founded: 2015,
    owner: { name: 'فيصل العتيبي', phone: '+966500000105' }, categories: ['dairy', 'frozen', 'juices'], share: 1, priceFactor: 1.01,
    coverage: [{ city: 'riyadh', fee: 45, free: 1500, lead: 1, sameDay: true }, { city: 'kharj', fee: 70, free: 2500, lead: 1 }, { city: 'buraydah', fee: 140, free: 5000, lead: 2 }, { city: 'dammam', fee: 150, free: 6000, lead: 2 }],
    warehouse: { name: 'مستودع التبريد بالمصانع', district: 'المصانع', lat: 24.5710, lng: 46.7610 },
    descAr: 'توزيع ألبان ولحوم ومجمدات بسلسلة تبريد متكاملة وشاحنات مبردة ومجمدة.', descEn: 'Dairy, meat and frozen distribution with a full cold chain and chilled/frozen trucks.', cr: '1010345672', vat: '310567890100003',
  },
  {
    slug: 'modern-hospitality', ar: 'مستلزمات الضيافة الحديثة', en: 'Modern Hospitality Supplies', legal: 'شركة مستلزمات الضيافة الحديثة', city: 'jeddah', color: '#0B2D5B', commission: 0.06, minOrder: 400, fleet: 'PLATFORM', rating: 4.4, ratingCount: 98, featured: true, founded: 2017,
    owner: { name: 'هاني باعشن', phone: '+966500000106' }, categories: ['horeca-supplies', 'cleaning'], share: 1, priceFactor: 1.0,
    coverage: [{ city: 'jeddah', fee: 25, free: 800, lead: 1, sameDay: true }, { city: 'makkah', fee: 40, free: 1200, lead: 1 }, { city: 'riyadh', fee: 70, free: 2500, lead: 2 }, { city: 'dammam', fee: 80, free: 3000, lead: 3 }, { city: 'madinah', fee: 60, free: 2000, lead: 2 }],
    warehouse: { name: 'مستودع البغدادية', district: 'البغدادية', lat: 21.4895, lng: 39.1841 },
    descAr: 'كل ما تحتاجه المطاعم والمقاهي من أكواب وعلب ومنظفات وقفازات بأسعار الجملة.', descEn: 'Everything restaurants and cafés need — cups, containers, cleaning and gloves at wholesale prices.', cr: '4030267890', vat: '310678901200003',
  },
  {
    slug: 'gulf-beverages', ar: 'الخليج للمشروبات', en: 'Gulf Beverages Co.', legal: 'شركة الخليج للمشروبات والتوزيع', city: 'riyadh', color: '#3182CE', commission: 0.04, minOrder: 300, fleet: 'OWN', rating: 4.6, ratingCount: 187, featured: false, founded: 2010,
    owner: { name: 'بندر القحطاني', phone: '+966500000107' }, categories: ['beverages', 'canned-food'], share: 1, priceFactor: 0.99,
    coverage: [{ city: 'riyadh', fee: 20, free: 500, lead: 1, sameDay: true }, { city: 'kharj', fee: 40, free: 1000, lead: 1 }, { city: 'dammam', fee: 60, free: 2000, lead: 2 }, { city: 'jeddah', fee: 70, free: 2500, lead: 2 }],
    warehouse: { name: 'مركز توزيع الدائري الجنوبي', district: 'الشفا', lat: 24.5641, lng: 46.7089 },
    descAr: 'توزيع مياه وعصائر ومشروبات غازية ومعلبات للأسواق والمطاعم والمكاتب.', descEn: 'Distribution of water, juices, soft drinks and canned food to markets, restaurants and offices.', cr: '1010456783', vat: '310789012300003',
  },
  {
    slug: 'tawreed-direct', ar: 'توريد المباشر', en: 'Tawreed Direct', legal: 'شركة توريد للتجارة الإلكترونية', city: 'riyadh', color: '#067A5B', commission: 0, minOrder: 300, fleet: 'PLATFORM', rating: 4.8, ratingCount: 402, featured: true, founded: 2024,
    owner: { name: 'فريق توريد المباشر', phone: '+966500000108' }, categories: ['coffee-tea', 'dates', 'rice', 'grains-legumes', 'sugar-flour', 'oils-ghee', 'canned-food', 'beverages', 'dairy', 'frozen', 'spices', 'cleaning', 'horeca-supplies'], share: 0.45, priceFactor: 0.985,
    coverage: [{ city: 'riyadh', fee: 25, free: 1000, lead: 1, sameDay: true }, { city: 'jeddah', fee: 35, free: 1500, lead: 2 }, { city: 'dammam', fee: 35, free: 1500, lead: 2 }, { city: 'makkah', fee: 45, free: 2000, lead: 2 }, { city: 'madinah', fee: 45, free: 2000, lead: 2 }, { city: 'khobar', fee: 35, free: 1500, lead: 2 }, { city: 'buraydah', fee: 60, free: 2500, lead: 3 }],
    warehouse: { name: 'مركز توريد اللوجستي', district: 'الشرق', lat: 24.7590, lng: 46.8350 },
    descAr: 'متجر توريد الرسمي: تشكيلة مختارة بأسعار مضمونة وتوصيل عبر أسطول توريد.', descEn: 'Tawreed’s official store: a curated range at guaranteed prices delivered by the Tawreed fleet.', cr: '1010000000', vat: '310000000000003',
  },
];

export interface SeedBuyer {
  name: string;
  legal: string;
  type: 'RETAIL' | 'SUPERMARKET' | 'RESTAURANT' | 'CAFE' | 'HOTEL' | 'CATERING' | 'COMPANY';
  city: string;
  cr: string;
  vat: string | null;
  verification: 'VERIFIED' | 'UNDER_REVIEW' | 'PENDING';
  credit: { limit: number; terms: number } | null;
  members: { name: string; phone: string; email?: string; role: 'OWNER' | 'PURCHASER' | 'ACCOUNTANT' | 'VIEWER' }[];
  address: { label: string; district: string; street: string; building: string; postal: string; short: string; lat: number; lng: number };
  branches: number;
}

export const BUYERS: SeedBuyer[] = [
  {
    name: 'أسواق الريحان المركزية', legal: 'شركة أسواق الريحان المركزية', type: 'SUPERMARKET', city: 'riyadh', cr: '1010567891', vat: '310890123400003', verification: 'VERIFIED', credit: { limit: 50000, terms: 30 }, branches: 6,
    members: [
      { name: 'عبدالله القحطاني', phone: '+966500000001', email: 'abdullah@rayhan.test', role: 'OWNER' },
      { name: 'محمد السبيعي', phone: '+966500000002', role: 'PURCHASER' },
      { name: 'أحمد عبدالعزيز', phone: '+966500000003', email: 'accounts@rayhan.test', role: 'ACCOUNTANT' },
    ],
    address: { label: 'المستودع الرئيسي', district: 'الملقا', street: 'طريق أنس بن مالك', building: '8123', postal: '13521', short: 'RRMA8123', lat: 24.8037, lng: 46.6139 },
  },
  {
    name: 'مطاعم سفرة الخير', legal: 'مؤسسة سفرة الخير للمطاعم', type: 'RESTAURANT', city: 'jeddah', cr: '4030678912', vat: '310901234500003', verification: 'VERIFIED', credit: null, branches: 3,
    members: [{ name: 'ياسر الزهراني', phone: '+966500000011', email: 'yasser@sufra.test', role: 'OWNER' }],
    address: { label: 'المطبخ المركزي', district: 'الروضة', street: 'شارع الأمير سلطان', building: '2210', postal: '23435', short: 'JERW2210', lat: 21.5589, lng: 39.1531 },
  },
  {
    name: 'مقهى نسمة الصباح', legal: 'مؤسسة نسمة الصباح للمقاهي', type: 'CAFE', city: 'dammam', cr: '2050789123', vat: null, verification: 'UNDER_REVIEW', credit: null, branches: 1,
    members: [{ name: 'ريم الخالدي', phone: '+966500000021', role: 'OWNER' }],
    address: { label: 'الفرع الرئيسي', district: 'الشاطئ', street: 'طريق الخليج', building: '3345', postal: '32413', short: 'DASH3345', lat: 26.4452, lng: 50.1123 },
  },
  {
    name: 'شركة الإعاشة المتحدة', legal: 'شركة الإعاشة المتحدة المحدودة', type: 'CATERING', city: 'riyadh', cr: '1010891234', vat: '311012345600003', verification: 'VERIFIED', credit: { limit: 250000, terms: 45 }, branches: 12,
    members: [
      { name: 'سلطان المطيري', phone: '+966500000031', email: 'sultan@united-catering.test', role: 'OWNER' },
      { name: 'مشاري الحربي', phone: '+966500000032', role: 'PURCHASER' },
    ],
    address: { label: 'مطبخ المدينة الصناعية', district: 'المدينة الصناعية الثانية', street: 'شارع 170', building: '4471', postal: '14332', short: 'RRIN4471', lat: 24.5590, lng: 46.8570 },
  },
];

export const DRIVERS = [
  { name: 'أحمد محمد', phone: '+966500000201', fleet: 'PLATFORM', plate: 'ط و ر 1201', vehicle: 'TRUCK_3T', capacity: 3000, reefer: false },
  { name: 'عمر الشهري', phone: '+966500000202', fleet: 'PLATFORM', plate: 'ط و ر 1202', vehicle: 'VAN', capacity: 1200, reefer: false },
  { name: 'يوسف البلوي', phone: '+966500000203', fleet: 'PLATFORM', plate: 'ط و ر 1203', vehicle: 'TRUCK_7T', capacity: 7000, reefer: true },
  { name: 'حسن الأحمدي', phone: '+966500000204', fleet: 'PLATFORM', plate: 'ط و ر 1204', vehicle: 'PICKUP', capacity: 900, reefer: false },
  { name: 'ناصر الدوسري', phone: '+966500000211', fleet: 'al-waha-foods', plate: 'و ح ة 3101', vehicle: 'TRUCK_3T', capacity: 3000, reefer: false },
  { name: 'بدر القرني', phone: '+966500000212', fleet: 'al-waha-foods', plate: 'و ح ة 3102', vehicle: 'VAN', capacity: 1500, reefer: false },
  { name: 'راشد العنزي', phone: '+966500000221', fleet: 'cold-pastures', plate: 'م ر ع 5201', vehicle: 'TRUCK_3T', capacity: 3000, reefer: true },
  { name: 'مازن الحربي', phone: '+966500000231', fleet: 'golden-grain-group', plate: 'ذ ه ب 7301', vehicle: 'TRUCK_12T', capacity: 12000, reefer: false },
  { name: 'طلال الجهني', phone: '+966500000241', fleet: 'gulf-beverages', plate: 'خ ل ج 4401', vehicle: 'TRUCK_3T', capacity: 3500, reefer: false },
] as const;
