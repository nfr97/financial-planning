/**
 * Transaction categorization logic
 * Extracted from transaction-analyzer.html for testability
 */

/**
 * Category patterns for auto-categorization
 * Each category maps to an array of regex patterns
 */
export const categoryPatterns = {
  'fixed-costs': [
    // Housing
    /rent|mortgage|hoa|property.*tax|home.*insurance|landlord|apartment|lease/i,
    // Utilities
    /electric|gas.*company|water.*bill|sewage|trash|waste|pge|con.*ed|duke.*energy|xcel|national.*grid|dominion/i,
    /comcast|xfinity|spectrum|at&t|verizon|t-mobile|sprint|cricket|internet|cable|fiber|broadband/i,
    // Phone
    /phone.*bill|wireless|cell.*phone|mobile.*plan/i,
    // Insurance
    /geico|allstate|state.*farm|progressive|liberty.*mutual|insurance|health.*plan|aetna|cigna|united.*health|blue.*cross|anthem|kaiser/i,
    // Car
    /car.*payment|auto.*loan|toyota.*financial|honda.*financial|ford.*credit|gm.*financial|bmw.*financial|mercedes.*financial/i,
    // Debt payments
    /student.*loan|nelnet|navient|fedloan|sofi|earnest|loan.*payment|great.*lakes|mohela/i,
    /credit.*card.*payment|minimum.*payment|debt.*payment/i,
    // Groceries (essential)
    /grocery|safeway|kroger|publix|trader.*joe|whole.*foods|aldi|costco|walmart|target|wegmans|heb|albertsons|giant|stop.*shop|food.*lion|winco|sprouts|meijer|food.*city/i,
    // Healthcare essentials
    /pharmacy|cvs|walgreens|rite.*aid|prescription|doctor|medical|copay|hospital|clinic|urgent.*care|lab|quest.*diagnostics|labcorp/i,
    // Childcare
    /daycare|childcare|preschool|tuition|school|kindercare|bright.*horizons/i,
    // Transportation essentials
    /gas.*station|shell|chevron|exxon|mobil|bp|arco|speedway|wawa|parking|toll|ez.*pass|sunpass|fastrak/i,
    /uber(?!.*eats)|lyft|transit|metro|subway.*fare|bus.*pass|caltrain|bart|mta|wmata/i,
    // Bank fees (unfortunately essential)
    /bank.*fee|monthly.*fee|service.*charge|overdraft/i,
  ],
  'short-term': [
    // Savings transfers
    /transfer.*to.*savings|savings.*deposit|marcus|ally.*savings|hysa/i,
    /emergency.*fund|vacation.*fund|sinking.*fund/i,
  ],
  'long-term': [
    // Retirement & Investments
    /401k|403b|ira|roth|vanguard|fidelity|schwab|etrade|robinhood|wealthfront|betterment/i,
    /investment|brokerage|stock.*purchase|dividend/i,
  ],
  'guilt-free': [
    // Dining & Drinks
    /restaurant|cafe|coffee|starbucks|dunkin|mcdonald|burger|pizza|chipotle|taco.*bell|wendy|chick-fil-a|panera|subway|panda.*express/i,
    /doordash|uber.*eats|grubhub|postmates|instacart|seamless|caviar|gopuff/i,
    /bar|brewery|pub|tavern|wine|liquor|total.*wine|bevmo/i,
    // Entertainment & Streaming
    /netflix|hulu|disney|hbo|max|amazon.*prime|spotify|apple.*music|youtube.*premium|paramount|peacock|crunchyroll|funimation/i,
    /movie|cinema|amc|regal|concert|ticket|eventbrite|stubhub|ticketmaster|livenation|fandango/i,
    /gaming|playstation|xbox|nintendo|steam|twitch|epic.*games|riot|blizzard/i,
    // Apple (subscriptions, App Store, iTunes)
    /apple\.com|apple\.com\/bill|itunes|app.*store|icloud/i,
    // Google (Play Store, YouTube, etc)
    /google.*play|google.*storage|google.*one|youtube/i,
    // Other Tech Subscriptions
    /microsoft|office.*365|adobe|creative.*cloud|dropbox|evernote|notion|slack|zoom|canva/i,
    // Shopping
    /amazon(?!.*prime.*member)|ebay|etsy|target(?!.*grocery)|walmart(?!.*grocery)|best.*buy|home.*depot|lowes|ikea|wayfair|overstock/i,
    /nordstrom|macy|kohls|tj.*maxx|marshalls|ross|old.*navy|gap|h&m|zara|uniqlo|shein|asos|fashion.*nova/i,
    /sephora|ulta|beauty|salon|spa|haircut|barber|nail|massage/i,
    // Hobbies & Fitness
    /gym|fitness|peloton|planet.*fitness|orange.*theory|crossfit|yoga|equinox|lifetime/i,
    /golf|ski|sports|hobby|craft|book|audible|kindle|barnes.*noble/i,
    // Subscriptions & Memberships
    /subscription|membership|patreon|substack|medium|onlyfans|twitch.*sub/i,
    /amazon.*prime.*member|costco.*member|sam.*club.*member/i,
    // Travel & Leisure
    /hotel|airbnb|vrbo|airline|flight|united|delta|american.*air|southwest|jetblue|spirit|frontier|expedia|booking|kayak|hotels\.com|tripadvisor/i,
    // Food delivery & meal kits
    /hellofresh|blue.*apron|factor|freshly|daily.*harvest/i,
    // Dating & Social
    /tinder|bumble|hinge|match\.com|dating/i,
    // Pet
    /petco|petsmart|chewy|pet.*supplies/i,
  ],
  income: [
    /payroll|direct.*deposit|salary|wage|employer|paycheck/i,
    /irs|tax.*refund|refund/i,
    /dividend|interest.*payment|interest.*earned/i,
    /venmo.*from|zelle.*from|paypal.*from|cash.*app.*from/i,
    /reimbursement|expense.*reimburse/i,
  ],
};

/**
 * Categorize a transaction with confidence scoring and sanity checks
 * @param {Object} transaction - Transaction object with description and amount
 * @param {string} transaction.description - Transaction description
 * @param {number} transaction.amount - Transaction amount (positive for income, negative for expense)
 * @param {Object} [patterns] - Optional custom patterns (defaults to categoryPatterns)
 * @returns {Object} Result with category, confidence, and reason
 */
export function categorizeWithConfidence(transaction, patterns = categoryPatterns) {
  const desc = transaction.description.toLowerCase();
  const amount = transaction.amount;
  const matches = [];

  // Collect pattern matches across categories (one match per category is sufficient)
  for (const [category, categoryPatternList] of Object.entries(patterns)) {
    for (const pattern of categoryPatternList) {
      if (pattern.test(desc)) {
        matches.push({ category, pattern: pattern.toString() });
        break; // One match per category is enough for conflict resolution
      }
    }
  }

  // No matches - return uncategorized
  if (matches.length === 0) {
    // For positive amounts with no pattern match, still mark as income but low confidence
    if (amount > 0) {
      return { category: 'income', confidence: 'low', reason: 'positive-amount-no-pattern' };
    }
    return { category: 'uncategorized', confidence: 'none', reason: 'no-match' };
  }

  // Single match - straightforward
  if (matches.length === 1) {
    const match = matches[0];
    // Sanity check: income pattern but negative amount
    if (match.category === 'income' && amount < 0) {
      return {
        category: 'uncategorized',
        confidence: 'low',
        reason: 'income-pattern-negative-amount',
      };
    }
    // Sanity check: expense category but positive amount (refund?)
    if (match.category !== 'income' && amount > 0) {
      return {
        category: 'income',
        confidence: 'medium',
        reason: 'expense-pattern-positive-amount-likely-refund',
      };
    }
    return { category: match.category, confidence: 'high', reason: 'single-match' };
  }

  // Multiple matches - need to resolve conflict
  const categories = [...new Set(matches.map((m) => m.category))];

  // If all matches point to same category, high confidence
  if (categories.length === 1) {
    const category = categories[0];
    // Apply same sanity checks
    if (category === 'income' && amount < 0) {
      return {
        category: 'uncategorized',
        confidence: 'low',
        reason: 'income-pattern-negative-amount',
      };
    }
    if (category !== 'income' && amount > 0) {
      return {
        category: 'income',
        confidence: 'medium',
        reason: 'expense-pattern-positive-amount-likely-refund',
      };
    }
    return { category, confidence: 'high', reason: 'multiple-matches-same-category' };
  }

  // Conflicting categories - use amount as tiebreaker
  if (amount > 0 && categories.includes('income')) {
    return {
      category: 'income',
      confidence: 'medium',
      reason: 'conflict-resolved-by-positive-amount',
    };
  }

  // For negative amounts, prefer expense categories in priority order
  const expensePriority = ['fixed-costs', 'guilt-free', 'long-term', 'short-term'];
  for (const cat of expensePriority) {
    if (categories.includes(cat)) {
      return { category: cat, confidence: 'low', reason: 'conflict-first-match-priority' };
    }
  }

  return { category: matches[0].category, confidence: 'low', reason: 'conflict-fallback' };
}

/**
 * Simple categorization that returns just the category
 * @param {Object} transaction - Transaction object
 * @param {Object} [patterns] - Optional custom patterns
 * @returns {string} Category name
 */
export function categorizeTransaction(transaction, patterns = categoryPatterns) {
  return categorizeWithConfidence(transaction, patterns).category;
}
