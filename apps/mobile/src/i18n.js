import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ponytail: hand-rolled dict + context, no i18next. ~2 languages, flat keys.
// Swap to a lib only if we add plurals/interpolation/many locales.
const KEY = "perx.lang";

const STRINGS = {
  en: {
    // tabs / nav
    Home: "Home", Explore: "Explore", "My Benefits": "My Benefits", Challenges: "Challenges", Profile: "Profile",
    // Explore
    explore: "Explore", search_ph: "Search benefits, providers…",
    forYou: "For You", browse: "Browse", nearby: "Nearby",
    pickedForYou: "Picked for you", dealsEnding: "Deals ending soon", trending: "Trending now",
    allBenefits: "All benefits", bundleDeals: "Bundle Deals",
    loadingPerks: "Loading your perks…", noOffers: "No offers match.",
    perk: "perk", perks: "perks", noOffersNow: "No offers right now.",
    locationOff: "Location off — showing all Tirana providers. Enable location for distances.",
    kmAway: "km away", add: "Add",
    // MyBenefits
    myBenefits: "My Benefits", myBenefitsSub: "Active, pending, saved & recurring",
    active: "Active", pending: "Pending", history: "History", saved: "Saved", recurring: "Recurring",
    noActive: "No active benefits yet.", noPending: "No pending approvals.", noHistory: "No history yet.",
    noSaved: "No saved offers. Tap the heart to bookmark.",
    noRecurring: "No auto-renewing benefits. Tap the icon on an offer to subscribe.",
    cancel: "Cancel", nextRenews: "Next renews", postReview: "Post Review", posting: "Posting…",
    shareExperience: "Share your experience…", rate: "Rate",
    // Concierge
    exodusSub: "Your AI benefits concierge",
    exodusGreeting: "Tell me what you're looking for — relaxation, fitness, food, travel — and your budget.",
    conciergeError: "Sorry, I had trouble there. Try again?",
    conciergePh: "something relaxing under 5,000 ALL",
    // Profile
    language: "Language", english: "English", albanian: "Albanian", logOut: "Log Out",
    account: "Account", availableBalance: "Available Balance",
    spent: "Spent", ofAmount: "of", yearInBenefits: "Year in Benefits", totalRedeemed: "Total redeemed",
    benefitsUsed: "Benefits used", taxSaved: "Tax saved", yourFavorite: "Your favorite: ",
    atProvider: "at", shareCredit: "Share credit with a colleague", giftCreditSub: "Gift reward credits to your team",
    categoryPrefs: "Category Preferences",
    giftCredit: "Credit", yourBalance: "Your balance:", pickColleague: "Pick a colleague and amount",
    sendAGift: "Send a Gift", giftProduct: "Product", giftBundle: "Bundle", giftTo: "Gift to",
    giftPickItem: "Pick something to gift", noBundles: "No bundles available.", giftedBy: "Gifted by",
    exceedsBalance: "Exceeds your balance", failedSend: "Failed to send",
    amountPh: "Amount", addNotePh: "Add a note (optional)", sending: "Sending…", sendGift: "Send Gift",
    // Home
    hi: "Hi", cart: "Cart", forYouCat: "For you", welcomeBack: "Welcome back to Perx", budgetLeft: "Budget left",
    recommended: "Recommended", featured: "Featured", addToCart: "Add to cart",
    newDeals: "New Deals", seeAll: "Explore",
    // Challenges
    challenges: "Challenges", activeChallenges: "Active challenges",
    achievements: "Achievements", teamGoals: "Team Goals", teamProgress: "Team progress",
    completed: "Completed", joinedKeepGoing: "Joined — keep going!",
    joinChallenge: "Join Challenge", markComplete: "Mark Complete", noChallenges: "No active challenges.",
    achievementsRewards: "Achievements & Rewards", unlocked: "Unlocked", doneCount: "done",
    // Auth
    appTagline: "Your benefits, your way", signInTitle: "Welcome back",
    signInSub: "Sign in to your benefits", emailPh: "Email", passwordPh: "Password",
    signingIn: "Signing in…", signIn: "Sign In",
    accountsByHr: "Accounts are created by your HR team. Contact HR if you need access.",
    useDemo: "Use demo account (Anja)",
    fillEmailPw: "Please enter your email and password.", serverUnreachable: "Couldn't reach the server.",
    // ChangePassword
    setNewPassword: "Set a new password",
    tempPasswordMsg: "Your account uses a temporary password. Choose a new one to continue.",
    newPasswordPh: "New password", confirmPasswordPh: "Confirm password",
    saving: "Saving…", savePassword: "Save Password", cancelSignOut: "Cancel & sign out",
    pwTooShort: "Password must be at least 6 characters.", pwMismatch: "Passwords don't match.",
    // Cart / components
    yourCart: "Your Cart", cartEmpty: "Cart is empty.", total: "Total",
    remainingAfter: "Remaining after", overBudget: "Over budget", requestApproval: "Request Approval →",
    // status
    statusPending: "Pending", statusApproved: "Approved", statusRejected: "Rejected",
    // Perxify
    Perxify: "Perxify", perxify: "Perxify", perxifySub: "Swipe to find perks you'll love",
    like: "LIKE", nope: "NOPE", superLike: "SUPER",
    perxifyDone: "Your matches are ready", youLove: "You're into",
    perxifyKeepSwiping: "Swipe a few more to unlock picks.",
    perxifyMore: "Swipe more",
    notifications: "Notifications",
    noNotifications: "No notifications yet.",
    newNotification: "New",
    giftFrom: "Gift from",
    benefitApproved: "Benefit approved ✅",
    benefitRejected: "Benefit request update ❌",
  },
  sq: {
    Home: "Kreu", Explore: "Eksploro", "My Benefits": "Përfitimet", Challenges: "Sfidat", Profile: "Profili",
    explore: "Eksploro", search_ph: "Kërko përfitime, ofrues…",
    forYou: "Për ty", browse: "Shfleto", nearby: "Afër meje",
    pickedForYou: "Zgjedhur për ty", dealsEnding: "Ofertat që mbarojnë", trending: "Në trend",
    allBenefits: "Të gjitha përfitimet", bundleDeals: "Paketa ofertash",
    loadingPerks: "Duke ngarkuar përfitimet…", noOffers: "Asnjë ofertë nuk përputhet.",
    perk: "ofertë", perks: "oferta", noOffersNow: "Asnjë ofertë për momentin.",
    locationOff: "Vendndodhja joaktive — po shfaqen të gjithë ofruesit në Tiranë. Aktivizo vendndodhjen për distancat.",
    kmAway: "km larg", add: "Shto",
    myBenefits: "Përfitimet e mia", myBenefitsSub: "Aktive, në pritje, të ruajtura & të përsëritura",
    active: "Aktive", pending: "Në pritje", history: "Historiku", saved: "Të ruajtura", recurring: "Të përsëritura",
    noActive: "Ende pa përfitime aktive.", noPending: "Asnjë miratim në pritje.", noHistory: "Ende pa historik.",
    noSaved: "Asnjë ofertë e ruajtur. Prek zemrën për ta ruajtur.",
    noRecurring: "Asnjë përfitim që rinovohet. Prek ikonën te një ofertë për t'u abonuar.",
    cancel: "Anulo", nextRenews: "Rinovohet më", postReview: "Posto vlerësimin", posting: "Duke postuar…",
    shareExperience: "Ndaj përvojën tënde…", rate: "Vlerëso",
    exodusSub: "Konçierxhi yt me AI",
    exodusGreeting: "Më thuaj çfarë kërkon — relaks, fitnes, ushqim, udhëtim — dhe buxhetin tënd.",
    conciergeError: "Më fal, pata një problem. Provo sërish?",
    conciergePh: "diçka relaksuese nën 5,000 ALL",
    language: "Gjuha", english: "Anglisht", albanian: "Shqip", logOut: "Dil",
    account: "Llogaria", availableBalance: "Bilanci në dispozicion",
    spent: "Shpenzuar", ofAmount: "nga", yearInBenefits: "Viti në përfitime", totalRedeemed: "Totali i shpenzuar",
    benefitsUsed: "Përfitime të përdorura", taxSaved: "Taksa e kursyer", yourFavorite: "E preferuara jote: ",
    atProvider: "te", shareCredit: "Ndaj kredi me një koleg", giftCreditSub: "Dhuro kredi shpërblimi ekipit tënd",
    categoryPrefs: "Preferencat e kategorive",
    giftCredit: "Kredi", yourBalance: "Bilanci yt:", pickColleague: "Zgjidh një koleg dhe shumën",
    sendAGift: "Dërgo një dhuratë", giftProduct: "Produkt", giftBundle: "Paketë", giftTo: "Dhuro për",
    giftPickItem: "Zgjidh diçka për të dhuruar", noBundles: "Asnjë paketë në dispozicion.", giftedBy: "Dhuruar nga",
    exceedsBalance: "Tejkalon bilancin tënd", failedSend: "Dërgimi dështoi",
    amountPh: "Shuma", addNotePh: "Shto një shënim (opsionale)", sending: "Duke dërguar…", sendGift: "Dërgo dhuratën",
    hi: "Përshëndetje", cart: "Shporta", forYouCat: "Për ty", welcomeBack: "Mirë se erdhe sërish te Perx", budgetLeft: "Buxheti i mbetur",
    recommended: "Rekomanduar", featured: "E zgjedhur", addToCart: "Shto në shportë",
    newDeals: "Oferta të reja", seeAll: "Eksploro",
    challenges: "Sfidat", activeChallenges: "Sfidat aktive",
    achievements: "Arritjet", teamGoals: "Objektivat e ekipit", teamProgress: "Progresi i ekipit",
    completed: "Përfunduar", joinedKeepGoing: "U bashkove — vazhdo kështu!",
    joinChallenge: "Bashkohu në sfidë", markComplete: "Përfundo sfidën", noChallenges: "Asnjë sfidë aktive.",
    achievementsRewards: "Arritjet & shpërblimet", unlocked: "Zhbllokuar", doneCount: "përfunduar",
    appTagline: "Përfitimet e tua, në mënyrën tënde", signInTitle: "Mirë se erdhe",
    signInSub: "Hyr te përfitimet e tua", emailPh: "Email", passwordPh: "Fjalëkalimi",
    signingIn: "Duke hyrë…", signIn: "Hyr",
    accountsByHr: "Llogaritë krijohen nga ekipi i HR. Kontakto HR nëse të duhet qasje.",
    useDemo: "Përdor llogarinë demo (Anja)",
    fillEmailPw: "Të lutem fut email-in dhe fjalëkalimin.", serverUnreachable: "Nuk u arrit serveri.",
    setNewPassword: "Vendos një fjalëkalim të ri",
    tempPasswordMsg: "Llogaria jote përdor një fjalëkalim të përkohshëm. Zgjidh një të ri për të vazhduar.",
    newPasswordPh: "Fjalëkalimi i ri", confirmPasswordPh: "Konfirmo fjalëkalimin",
    saving: "Duke ruajtur…", savePassword: "Ruaj fjalëkalimin", cancelSignOut: "Anulo & dil",
    pwTooShort: "Fjalëkalimi duhet të jetë të paktën 6 karaktere.", pwMismatch: "Fjalëkalimet nuk përputhen.",
    yourCart: "Shporta jote", cartEmpty: "Shporta është bosh.", total: "Totali",
    remainingAfter: "Mbetet pas", overBudget: "Mbi buxhet", requestApproval: "Kërko miratim →",
    statusPending: "Në pritje", statusApproved: "Miratuar", statusRejected: "Refuzuar",
    Perxify: "Perxify", perxify: "Perxify", perxifySub: "Rrëshqit për të gjetur përfitime që do t'i duash",
    like: "PËLQE", nope: "JO", superLike: "SUPER",
    perxifyDone: "Përputhjet e tua janë gati", youLove: "Të pëlqejnë",
    perxifyKeepSwiping: "Rrëshqit edhe pak për të zbuluar zgjedhjet.",
    perxifyMore: "Rrëshqit më shumë",
    notifications: "Njoftimet",
    noNotifications: "Nuk ka njoftime ende.",
    newNotification: "I ri",
    giftFrom: "Dhuratë nga",
    benefitApproved: "Përfitimi u miratua ✅",
    benefitRejected: "Përditësim i kërkesës ❌",
  },
};

const Ctx = createContext({ lang: "en", t: (k) => k, setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState("en");
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => v && setLangState(v)); }, []);
  const setLang = (l) => { setLangState(l); AsyncStorage.setItem(KEY, l); };
  const t = (k) => STRINGS[lang][k] ?? STRINGS.en[k] ?? k;
  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
