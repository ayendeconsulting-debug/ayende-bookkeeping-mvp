/**
 * Phase 34: Plaid Merchant Category Code (MCC) -> CoA category map.
 *
 * MCC is the 4-digit payment-network category code Plaid surfaces on most
 * card transactions. When vendor pattern matching misses, MCC is the next
 * fallback — covers a huge slice of the long tail without per-vendor curation.
 *
 * SOURCE OF TRUTH: this file. Re-running POST /admin/seed-mcc-map upserts
 * by mcc (existing rows update; new rows insert).
 *
 * Coverage: ~250 most common MCCs across food, fuel, retail, transport,
 * lodging, healthcare, professional services, government. Less common
 * MCCs are intentionally omitted — they fall through to AI fallback.
 *
 * Vocabulary for category_hint MUST match VendorLibrary.category_hint.
 */

export interface MccMapEntry {
  mcc: string;
  category_hint: string;
  account_subtype: string | null;
  default_personal: boolean;
  description: string;
}

export const MCC_CATEGORY_MAP: MccMapEntry[] = [
  // ─── FOOD & DINING ───────────────────────────────────────────────────
  { mcc: '5811', category_hint: 'meals', account_subtype: null, default_personal: false, description: 'Caterers' },
  { mcc: '5812', category_hint: 'meals', account_subtype: null, default_personal: false, description: 'Eating Places, Restaurants' },
  { mcc: '5813', category_hint: 'meals', account_subtype: null, default_personal: false, description: 'Drinking Places, Bars, Lounges, Taverns' },
  { mcc: '5814', category_hint: 'meals', account_subtype: null, default_personal: false, description: 'Fast Food Restaurants' },

  // ─── GROCERY ─────────────────────────────────────────────────────────
  { mcc: '5411', category_hint: 'groceries', account_subtype: null, default_personal: true, description: 'Grocery Stores, Supermarkets' },
  { mcc: '5422', category_hint: 'groceries', account_subtype: null, default_personal: true, description: 'Freezer and Locker Meat Provisioners' },
  { mcc: '5441', category_hint: 'groceries', account_subtype: null, default_personal: true, description: 'Candy, Nut, and Confectionery Stores' },
  { mcc: '5451', category_hint: 'groceries', account_subtype: null, default_personal: true, description: 'Dairy Products Stores' },
  { mcc: '5462', category_hint: 'groceries', account_subtype: null, default_personal: true, description: 'Bakeries' },
  { mcc: '5499', category_hint: 'groceries', account_subtype: null, default_personal: true, description: 'Misc Food Stores - Convenience Stores' },

  // ─── FUEL / GAS ──────────────────────────────────────────────────────
  { mcc: '5172', category_hint: 'fuel', account_subtype: null, default_personal: false, description: 'Petroleum and Petroleum Products' },
  { mcc: '5541', category_hint: 'fuel', account_subtype: null, default_personal: false, description: 'Service Stations (with or without Ancillary Services)' },
  { mcc: '5542', category_hint: 'fuel', account_subtype: null, default_personal: false, description: 'Automated Fuel Dispensers' },
  { mcc: '5983', category_hint: 'fuel', account_subtype: null, default_personal: false, description: 'Fuel Dealers (Non Automotive)' },

  // ─── TRANSPORTATION ──────────────────────────────────────────────────
  { mcc: '4011', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Railroads' },
  { mcc: '4111', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Local/Suburban Commuter Passenger Transport' },
  { mcc: '4112', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Passenger Railways' },
  { mcc: '4119', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Ambulance Services' },
  { mcc: '4121', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Taxicabs/Limousines' },
  { mcc: '4131', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Bus Lines' },
  { mcc: '4214', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Motor Freight Carriers and Trucking' },
  { mcc: '4215', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Courier Services - Air or Ground' },
  { mcc: '4225', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Public Warehousing and Storage' },
  { mcc: '4411', category_hint: 'travel', account_subtype: null, default_personal: false, description: 'Cruise Lines' },
  { mcc: '4457', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Boat Rentals and Leasing' },
  { mcc: '4468', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Marinas, Marine Service, and Supplies' },
  { mcc: '4511', category_hint: 'travel', account_subtype: null, default_personal: false, description: 'Airlines, Air Carriers' },
  { mcc: '4582', category_hint: 'travel', account_subtype: null, default_personal: false, description: 'Airports, Flying Fields' },
  { mcc: '4722', category_hint: 'travel', account_subtype: null, default_personal: false, description: 'Travel Agencies, Tour Operators' },
  { mcc: '4761', category_hint: 'travel', account_subtype: null, default_personal: false, description: 'Telemarketing Travel Related Arrangement Services' },
  { mcc: '4784', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Tolls and Bridge Fees' },
  { mcc: '4789', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Transportation Services (Not Elsewhere Classified)' },
  { mcc: '7512', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Car Rental Agencies' },
  { mcc: '7513', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Truck and Utility Trailer Rentals' },
  { mcc: '7519', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Motor Home and Recreational Vehicle Rentals' },
  { mcc: '7523', category_hint: 'transportation', account_subtype: null, default_personal: false, description: 'Parking Lots, Parking Meters and Garages' },

  // ─── LODGING ─────────────────────────────────────────────────────────
  { mcc: '3501', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Holiday Inns' },
  { mcc: '3503', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Sheraton Hotels' },
  { mcc: '3504', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Hilton Hotels' },
  { mcc: '3509', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Marriott' },
  { mcc: '3640', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Hyatt Hotels' },
  { mcc: '3666', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Westin Hotels' },
  { mcc: '7011', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Lodging - Hotels, Motels, Resorts (Not Elsewhere Classified)' },
  { mcc: '7012', category_hint: 'lodging', account_subtype: null, default_personal: false, description: 'Timeshares' },

  // ─── RETAIL ──────────────────────────────────────────────────────────
  { mcc: '5200', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Home Supply Warehouse Stores' },
  { mcc: '5211', category_hint: 'retail', account_subtype: null, default_personal: false, description: 'Lumber and Building Materials Stores' },
  { mcc: '5231', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Glass, Paint, Wallpaper Stores' },
  { mcc: '5251', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Hardware Stores' },
  { mcc: '5261', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Nurseries - Lawn and Garden Supply Store' },
  { mcc: '5271', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Mobile Home Dealers' },
  { mcc: '5300', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Wholesale Clubs' },
  { mcc: '5309', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Duty Free Stores' },
  { mcc: '5310', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Discount Stores' },
  { mcc: '5311', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Department Stores' },
  { mcc: '5331', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Variety Stores' },
  { mcc: '5399', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Misc General Merchandise' },
  { mcc: '5611', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Mens and Boys Clothing and Accessories Stores' },
  { mcc: '5621', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Womens Ready-To-Wear Stores' },
  { mcc: '5631', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Womens Accessory and Specialty Shops' },
  { mcc: '5641', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Childrens and Infants Wear Stores' },
  { mcc: '5651', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Family Clothing Stores' },
  { mcc: '5655', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Sports and Riding Apparel Stores' },
  { mcc: '5661', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Shoe Stores' },
  { mcc: '5681', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Furriers and Fur Shops' },
  { mcc: '5691', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Mens, Womens Clothing Stores' },
  { mcc: '5697', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Tailors, Alterations' },
  { mcc: '5698', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Wig and Toupee Stores' },
  { mcc: '5699', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Miscellaneous Apparel and Accessory Shops' },
  { mcc: '5712', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Furniture, Home Furnishings, and Equipment Stores' },
  { mcc: '5713', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Floor Covering Stores' },
  { mcc: '5714', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Drapery, Window Covering, and Upholstery Stores' },
  { mcc: '5718', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Fireplace, Fireplace Screens, and Accessories Stores' },
  { mcc: '5719', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Misc Home Furnishing Specialty Stores' },
  { mcc: '5722', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Household Appliance Stores' },
  { mcc: '5732', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Electronics Stores' },
  { mcc: '5733', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Music Stores-Musical Instruments, Pianos, And Sheet Music' },
  { mcc: '5734', category_hint: 'software', account_subtype: null, default_personal: false, description: 'Computer Software Stores' },
  { mcc: '5735', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Record Stores' },
  { mcc: '5811', category_hint: 'meals', account_subtype: null, default_personal: false, description: 'Caterers' },
  { mcc: '5912', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Drug Stores and Pharmacies' },
  { mcc: '5921', category_hint: 'meals', account_subtype: null, default_personal: false, description: 'Package Stores-Beer, Wine, and Liquor' },
  { mcc: '5931', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Used Merchandise and Secondhand Stores' },
  { mcc: '5932', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Antique Shops' },
  { mcc: '5933', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Pawn Shops' },
  { mcc: '5935', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Wrecking and Salvage Yards' },
  { mcc: '5937', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Antique Reproductions' },
  { mcc: '5940', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Bicycle Shops' },
  { mcc: '5941', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Sporting Goods Stores' },
  { mcc: '5942', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Book Stores' },
  { mcc: '5943', category_hint: 'office_supplies', account_subtype: null, default_personal: false, description: 'Stationery Stores, Office, and School Supply Stores' },
  { mcc: '5944', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Jewelry Stores, Watches, Clocks, and Silverware Stores' },
  { mcc: '5945', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Hobby, Toy, and Game Shops' },
  { mcc: '5946', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Camera and Photographic Supply Stores' },
  { mcc: '5947', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Gift, Card, Novelty, and Souvenir Shops' },
  { mcc: '5948', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Luggage and Leather Goods Stores' },
  { mcc: '5949', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Sewing, Needlework, Fabric, and Piece Goods Stores' },
  { mcc: '5950', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Glassware, Crystal Stores' },
  { mcc: '5970', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Artists Supply and Craft Shops' },
  { mcc: '5971', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Art Dealers and Galleries' },
  { mcc: '5972', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Stamp and Coin Stores' },
  { mcc: '5973', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Religious Goods Stores' },
  { mcc: '5975', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Hearing Aids Sales and Supplies' },
  { mcc: '5976', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Orthopedic Goods - Prosthetic Devices' },
  { mcc: '5977', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Cosmetic Stores' },
  { mcc: '5978', category_hint: 'retail', account_subtype: null, default_personal: false, description: 'Typewriter Stores' },
  { mcc: '5992', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Florists' },
  { mcc: '5993', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Cigar Stores and Stands' },
  { mcc: '5994', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'News Dealers and Newsstands' },
  { mcc: '5995', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Pet Shops, Pet Food, and Supplies' },
  { mcc: '5999', category_hint: 'retail', account_subtype: null, default_personal: true, description: 'Misc Specialty Retail' },

  // ─── HEALTHCARE ──────────────────────────────────────────────────────
  { mcc: '4119', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Ambulance Services' },
  { mcc: '5912', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Drug Stores and Pharmacies' },
  { mcc: '5975', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Hearing Aids' },
  { mcc: '5976', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Orthopedic Goods' },
  { mcc: '8011', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Doctors' },
  { mcc: '8021', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Dentists, Orthodontists' },
  { mcc: '8031', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Osteopaths' },
  { mcc: '8041', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Chiropractors' },
  { mcc: '8042', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Optometrists, Ophthalmologist' },
  { mcc: '8043', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Opticians, Eyeglasses' },
  { mcc: '8049', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Podiatrists, Chiropodists' },
  { mcc: '8050', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Nursing/Personal Care' },
  { mcc: '8062', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Hospitals' },
  { mcc: '8071', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Medical and Dental Labs' },
  { mcc: '8099', category_hint: 'healthcare', account_subtype: null, default_personal: true, description: 'Medical Services and Health Practitioners' },

  // ─── PROFESSIONAL SERVICES ───────────────────────────────────────────
  { mcc: '7210', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Laundry, Cleaning, Garment Services' },
  { mcc: '7211', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Laundries' },
  { mcc: '7216', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Dry Cleaners' },
  { mcc: '7217', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Carpet/Upholstery Cleaning' },
  { mcc: '7221', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Photographic Studios' },
  { mcc: '7230', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Barber and Beauty Shops' },
  { mcc: '7251', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Shoe Repair/Hat Cleaning' },
  { mcc: '7261', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Funeral Service, Crematories' },
  { mcc: '7273', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Dating/Escort Services' },
  { mcc: '7276', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Tax Preparation Services' },
  { mcc: '7277', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Counseling Services' },
  { mcc: '7278', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Buying/Shopping Services, Clubs' },
  { mcc: '7296', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Clothing Rental' },
  { mcc: '7297', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Massage Parlors' },
  { mcc: '7298', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Health and Beauty Spas' },
  { mcc: '7299', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Misc General Services' },
  { mcc: '7311', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Advertising Services' },
  { mcc: '7321', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Consumer Credit Reporting Agencies' },
  { mcc: '7333', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Commercial Photography, Art and Graphics' },
  { mcc: '7338', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Quick Copy, Repro, and Blueprinting' },
  { mcc: '7339', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Secretarial Support Services' },
  { mcc: '7342', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Exterminating Services' },
  { mcc: '7349', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Cleaning and Maintenance' },
  { mcc: '7361', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Employment/Temp Agencies' },
  { mcc: '7372', category_hint: 'software', account_subtype: null, default_personal: false, description: 'Computer Programming, Data Processing' },
  { mcc: '7375', category_hint: 'software', account_subtype: null, default_personal: false, description: 'Information Retrieval Services' },
  { mcc: '7379', category_hint: 'software', account_subtype: null, default_personal: false, description: 'Computer Repair' },
  { mcc: '7392', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Consulting, Public Relations' },
  { mcc: '7393', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Detective Agencies, Protective Services' },
  { mcc: '7394', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Equipment Rental and Leasing Services' },
  { mcc: '7395', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Photo Developing' },
  { mcc: '7399', category_hint: 'professional', account_subtype: null, default_personal: false, description: 'Business Services' },

  // ─── ENTERTAINMENT / RECREATION ──────────────────────────────────────
  { mcc: '7829', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Picture/Video Production' },
  { mcc: '7832', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Motion Picture Theaters' },
  { mcc: '7841', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Video Tape Rental Stores' },
  { mcc: '7911', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Dance Halls, Studios, Schools' },
  { mcc: '7922', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Theatrical Producers, Ticket Agencies' },
  { mcc: '7929', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Bands, Orchestras' },
  { mcc: '7932', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Billiard/Pool Establishments' },
  { mcc: '7933', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Bowling Alleys' },
  { mcc: '7941', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Sports Clubs/Fields' },
  { mcc: '7991', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Tourist Attractions and Exhibits' },
  { mcc: '7992', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Golf Courses - Public' },
  { mcc: '7993', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Video Amusement Game Supplies' },
  { mcc: '7994', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Video Game Arcades' },
  { mcc: '7995', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Betting/Casino Gambling' },
  { mcc: '7996', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Amusement Parks/Carnivals' },
  { mcc: '7997', category_hint: 'fitness', account_subtype: null, default_personal: true, description: 'Country Clubs, Membership Clubs' },
  { mcc: '7998', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Aquariums' },
  { mcc: '7999', category_hint: 'entertainment', account_subtype: null, default_personal: true, description: 'Recreation Services' },

  // ─── EDUCATION ───────────────────────────────────────────────────────
  { mcc: '8211', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Elementary, Secondary Schools' },
  { mcc: '8220', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Colleges, Universities' },
  { mcc: '8241', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Correspondence Schools' },
  { mcc: '8244', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Business/Secretarial Schools' },
  { mcc: '8249', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Vocational/Trade Schools' },
  { mcc: '8299', category_hint: 'professional', account_subtype: null, default_personal: true, description: 'Schools and Educational Services' },

  // ─── UTILITIES ───────────────────────────────────────────────────────
  { mcc: '4812', category_hint: 'telecom', account_subtype: null, default_personal: true, description: 'Telecommunication Equipment and Telephone Sales' },
  { mcc: '4813', category_hint: 'telecom', account_subtype: null, default_personal: true, description: 'Key-entry Telecom Merchant' },
  { mcc: '4814', category_hint: 'telecom', account_subtype: null, default_personal: true, description: 'Telecommunication Services' },
  { mcc: '4815', category_hint: 'telecom', account_subtype: null, default_personal: true, description: 'Telephone (Visa Phone)' },
  { mcc: '4816', category_hint: 'telecom', account_subtype: null, default_personal: true, description: 'Computer Network Services' },
  { mcc: '4821', category_hint: 'telecom', account_subtype: null, default_personal: false, description: 'Telegraph Services' },
  { mcc: '4829', category_hint: 'telecom', account_subtype: null, default_personal: false, description: 'Wires, Money Orders' },
  { mcc: '4899', category_hint: 'telecom', account_subtype: null, default_personal: true, description: 'Cable, Satellite, Other Pay TV/Radio' },
  { mcc: '4900', category_hint: 'utilities', account_subtype: null, default_personal: true, description: 'Utilities - Electric, Gas, Water, Sanitary' },

  // ─── FINANCIAL ───────────────────────────────────────────────────────
  { mcc: '6010', category_hint: 'banking', account_subtype: null, default_personal: false, description: 'Member Financial Institution - Manual Cash' },
  { mcc: '6011', category_hint: 'banking', account_subtype: null, default_personal: false, description: 'Member Financial Institution - ATM' },
  { mcc: '6012', category_hint: 'banking', account_subtype: null, default_personal: false, description: 'Member Financial Institution - Merchandise' },
  { mcc: '6051', category_hint: 'banking', account_subtype: null, default_personal: false, description: 'Non-FI, Money Orders' },
  { mcc: '6211', category_hint: 'banking', account_subtype: null, default_personal: false, description: 'Security Brokers/Dealers' },
  { mcc: '6300', category_hint: 'banking', account_subtype: null, default_personal: true, description: 'Insurance Sales, Underwriting' },
  { mcc: '6381', category_hint: 'banking', account_subtype: null, default_personal: true, description: 'Insurance Premiums' },
  { mcc: '6399', category_hint: 'banking', account_subtype: null, default_personal: false, description: 'Insurance, Not Elsewhere Classified' },
  { mcc: '6513', category_hint: 'banking', account_subtype: null, default_personal: true, description: 'Real Estate Agents and Managers' },

  // ─── GOVERNMENT ──────────────────────────────────────────────────────
  { mcc: '9211', category_hint: 'government', account_subtype: null, default_personal: false, description: 'Court Costs Including Alimony, Child Support' },
  { mcc: '9222', category_hint: 'government', account_subtype: null, default_personal: false, description: 'Fines' },
  { mcc: '9223', category_hint: 'government', account_subtype: null, default_personal: false, description: 'Bail and Bond Payments' },
  { mcc: '9311', category_hint: 'government', account_subtype: null, default_personal: false, description: 'Tax Payments' },
  { mcc: '9399', category_hint: 'government', account_subtype: null, default_personal: false, description: 'Government Services (Not Elsewhere Classified)' },
  { mcc: '9402', category_hint: 'government', account_subtype: null, default_personal: false, description: 'Postal Services - Government Only' },
  { mcc: '9405', category_hint: 'government', account_subtype: null, default_personal: false, description: 'Intra-Government Purchases' },
];