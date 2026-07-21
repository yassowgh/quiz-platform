export type Lang = "en" | "ar";

export const TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  // nav / general
  reports: { en: "Reports", ar: "التقارير" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  logIn: { en: "Log in", ar: "تسجيل الدخول" },
  signUp: { en: "Sign up", ar: "إنشاء حساب" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  loading: { en: "Loading...", ar: "جارٍ التحميل..." },
  back: { en: "Back", ar: "رجوع" },
  save: { en: "Save", ar: "حفظ" },
  delete: { en: "Delete", ar: "حذف" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  copy: { en: "Copy", ar: "نسخ" },
  copied: { en: "Copied!", ar: "تم النسخ!" },

  // home
  tagline: { en: "Live multiplayer quizzes", ar: "اختبارات تفاعلية جماعية مباشرة" },
  freeAlternative: { en: "The free Kahoot alternative", ar: "البديل المجاني لكاهوت" },
  enterPin: { en: "Enter", ar: "دخول" },
  wantToHost: { en: "Want to host a quiz?", ar: "هل تريد استضافة اختبار؟" },
  createQuiz: { en: "Create a Quiz →", ar: "أنشئ اختباراً ←" },
  pinError: { en: "Enter a 6-digit game PIN", ar: "أدخل رمز اللعبة المكوّن من 6 أرقام" },
  gameNotFound: { en: "Game not found. Check your PIN.", ar: "لم يتم العثور على اللعبة. تحقق من الرمز." },

  // join / lobby
  youreIn: { en: "You're in!", ar: "لقد انضممت!" },
  chooseNickname: { en: "Choose your nickname", ar: "اختر اسمك المستعار" },
  joinGame: { en: "Join Game!", ar: "انضم للعبة!" },
  teamName: { en: "Team name", ar: "اسم الفريق" },
  gamePin: { en: "Game PIN", ar: "رمز اللعبة" },
  players: { en: "Players", ar: "اللاعبون" },
  waitingForHost: { en: "Waiting for host to start...", ar: "بانتظار بدء المضيف..." },
  startGame: { en: "Start Game", ar: "ابدأ اللعبة" },
  createGameRoom: { en: "Create Game Room", ar: "أنشئ غرفة اللعبة" },
  scanToJoin: { en: "Scan the QR code to join instantly", ar: "امسح رمز QR للانضمام فوراً" },
  lock: { en: "Lock", ar: "قفل" },

  // gameplay
  tapToAnswer: { en: "Tap to answer", ar: "اضغط للإجابة" },
  yourAnswer: { en: "Your answer", ar: "إجابتك" },
  typeYourAnswer: { en: "Type your answer...", ar: "اكتب إجابتك..." },
  submitAnswer: { en: "Submit Answer", ar: "إرسال الإجابة" },
  submitOrder: { en: "Submit Order", ar: "إرسال الترتيب" },
  submitSelection: { en: "Submit Selection", ar: "إرسال الاختيار" },
  orderSubmitted: { en: "Order submitted!", ar: "تم إرسال الترتيب!" },
  waitingForResults: { en: "Waiting for results...", ar: "بانتظار النتائج..." },
  correct: { en: "Correct!", ar: "إجابة صحيحة!" },
  wrong: { en: "Wrong!", ar: "إجابة خاطئة!" },
  timesUp: { en: "Time's up!", ar: "انتهى الوقت!" },
  voteRecorded: { en: "Vote recorded!", ar: "تم تسجيل تصويتك!" },
  answerStreak: { en: "answer streak!", ar: "إجابات صحيحة متتالية!" },
  total: { en: "Total", ar: "المجموع" },
  pts: { en: "pts", ar: "نقطة" },
  answered: { en: "answered", ar: "أجابوا" },
  leaderboard: { en: "Leaderboard", ar: "لوحة المتصدرين" },
  nextQuestion: { en: "Next Question", ar: "السؤال التالي" },
  showPodium: { en: "Show Podium", ar: "عرض المنصة" },
  showLeaderboard: { en: "Show Leaderboard", ar: "عرض لوحة المتصدرين" },
  skipReveal: { en: "Skip / Reveal", ar: "تخطٍّ / إظهار الإجابة" },
  finalResults: { en: "Final Results", ar: "النتائج النهائية" },
  gameOver: { en: "Game Over!", ar: "انتهت اللعبة!" },
  endGame: { en: "End Game", ar: "إنهاء اللعبة" },
  thanksForPlaying: { en: "Thanks for playing!", ar: "شكراً للعبك معنا!" },
  finalScore: { en: "Final score", ar: "النتيجة النهائية" },
  playAgain: { en: "Play again", ar: "العب مرة أخرى" },
  typeOnDevices: { en: "Players type their answer on their devices!", ar: "يكتب اللاعبون إجاباتهم على أجهزتهم!" },
  sortOnDevices: { en: "Sort these on your device!", ar: "رتّب هذه على جهازك!" },
  selectAllThatApply: { en: "Select all that apply", ar: "اختر كل ما ينطبق" },
};

export function t(key: string, lang: Lang): string {
  const entry = TRANSLATIONS[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}
