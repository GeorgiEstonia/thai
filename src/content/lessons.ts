import type { NewWord } from '@/lib/words'

/**
 * Vocabulary transcribed from photographed lesson pages.
 *
 * Shipped as content rather than imported through the app because the reading
 * had already been done — by the time these existed as text, putting them back
 * through a camera and a vision model would have been the app redoing work for
 * no reason, and pasting eight blocks by hand is not a task worth handing to
 * someone with ten minutes a week.
 *
 * Each set is applied once, by id. Adding to the deck already refuses anything
 * it holds, so a set that overlaps an earlier import costs nothing.
 */

export interface LessonSet {
  id: string
  pack: string
  items: Omit<NewWord, 'source' | 'pack'>[]
}

export const LESSON_SETS: LessonSet[] = [
  {
    id: 'lesson-5',
    pack: "Yesterday and Tomorrow",
    items: [
          {
                "thai": "วัน",
                "ipa": "wan",
                "english": "day",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันนี้",
                "ipa": "wan-níi",
                "english": "today",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เมื่อวานนี้",
                "ipa": "mɯ̂a-waan-níi",
                "english": "yesterday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "พรุ่งนี้",
                "ipa": "phrûŋ-níi",
                "english": "tomorrow",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันจันทร์",
                "ipa": "wan-can",
                "english": "Monday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันอังคาร",
                "ipa": "wan-ʔaŋ-khaan",
                "english": "Tuesday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันพุธ",
                "ipa": "wan-phút",
                "english": "Wednesday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันพฤหัสบดี",
                "ipa": "wan-phá-rɯ́-hàt-sà-bɔɔ-dii",
                "english": "Thursday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันศุกร์",
                "ipa": "wan-sùk",
                "english": "Friday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันเสาร์",
                "ipa": "wan-sǎo",
                "english": "Saturday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วันอาทิตย์",
                "ipa": "wan-ʔaa-thít",
                "english": "Sunday",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อาทิตย์",
                "ipa": "ʔaa-thít",
                "english": "week",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อาทิตย์นี้",
                "ipa": "ʔaa-thít-níi",
                "english": "this week",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อาทิตย์ที่แล้ว",
                "ipa": "ʔaa-thít-thîi-lɛ́ɛw",
                "english": "last week",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อาทิตย์หน้า",
                "ipa": "ʔaa-thít-nâa",
                "english": "next week",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เดือน",
                "ipa": "dɯan",
                "english": "month",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เดือนนี้",
                "ipa": "dɯan-níi",
                "english": "this month",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เดือนที่แล้ว",
                "ipa": "dɯan-thîi-lɛ́ɛw",
                "english": "last month",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เดือนหน้า",
                "ipa": "dɯan-nâa",
                "english": "next month",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปี",
                "ipa": "pii",
                "english": "year",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปีนี้",
                "ipa": "pii-níi",
                "english": "this year",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปีที่แล้ว",
                "ipa": "pii-thîi-lɛ́ɛw",
                "english": "last year",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปีหน้า",
                "ipa": "pii-nâa",
                "english": "next year",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วัด",
                "ipa": "wát",
                "english": "temple",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "นา",
                "ipa": "naa",
                "english": "rice field",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ตลาด",
                "ipa": "tà-làat",
                "english": "market",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ห้องสมุด",
                "ipa": "hɔ̂ŋ-sà-mùt",
                "english": "library",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แม่น้ำ",
                "ipa": "mɛ̂ɛ-nám",
                "english": "river",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "น้ำตก",
                "ipa": "nám-tòk",
                "english": "waterfall",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ทะเล",
                "ipa": "thá-lee",
                "english": "sea, beach",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ภูเขา",
                "ipa": "phuu-khǎo",
                "english": "mountain",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไป",
                "ipa": "pai",
                "english": "to go",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ทำ",
                "ipa": "tham",
                "english": "to do",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วิ่ง",
                "ipa": "wîŋ",
                "english": "to run",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ดูหนัง",
                "ipa": "duu-nǎŋ",
                "english": "to watch a film",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ฟังเพลง",
                "ipa": "faŋ-phleeŋ",
                "english": "to listen to music",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ร้องเพลง",
                "ipa": "rɔ́ɔŋ-phleeŋ",
                "english": "to sing",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เต้น",
                "ipa": "tên",
                "english": "to dance",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เล่นดนตรี",
                "ipa": "lên-don-trii",
                "english": "to play a musical instrument",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ว่ายน้ำ",
                "ipa": "wâay-náam",
                "english": "to swim",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขี่จักรยาน",
                "ipa": "khìi-càk-krà-yaan",
                "english": "to ride a bicycle",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เดินป่า",
                "ipa": "dəən-pàa",
                "english": "to hike",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ทำสวน",
                "ipa": "tham-sǔan",
                "english": "to garden",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไปเที่ยว",
                "ipa": "pai-thîaw",
                "english": "to go on a trip, to travel",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เวลาว่าง",
                "ipa": "wee-laa-wâaŋ",
                "english": "free time",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ชอบ",
                "ipa": "chɔ̂ɔp",
                "english": "to like",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เล่น",
                "ipa": "lên",
                "english": "to play",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เพื่อน",
                "ipa": "phɯ̂an",
                "english": "friend",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ครอบครัว",
                "ipa": "khrɔ̂ɔp-khrua",
                "english": "family",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "กับ",
                "ipa": "kàp",
                "english": "with, and",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แล้วก็",
                "ipa": "lɛ́ɛw-kɔ̂",
                "english": "and then, also",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "จะ",
                "ipa": "cà",
                "english": "will",
                "kind": "word",
                "notes": "future marker, goes before the verb"
          },
          {
                "thai": "กลับ",
                "ipa": "klàp",
                "english": "to return, to go back",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เมื่อวานนี้ คุณไปไหนมา",
                "ipa": "mɯ̂a-waan-níi khun pai-nǎi-maa",
                "english": "Where did you go yesterday?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เมื่อวานนี้ ผมไปห้องสมุด",
                "ipa": "mɯ̂a-waan-níi phǒm pai hɔ̂ŋ-sà-mùt",
                "english": "Yesterday I went to the library.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "พรุ่งนี้ คุณจะไปไหน",
                "ipa": "phrûŋ-níi khun cà pai-nǎi",
                "english": "Where are you going tomorrow?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เวลาว่าง คุณชอบทำอะไร",
                "ipa": "wee-laa-wâaŋ khun chɔ̂ɔp tham-ʔà-rai",
                "english": "What do you like to do in your free time?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ผมชอบฟังเพลง",
                "ipa": "phǒm chɔ̂ɔp faŋ-phleeŋ",
                "english": "I like listening to music.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เดือนหน้า ผมจะไปเที่ยวทะเล",
                "ipa": "dɯan-nâa phǒm cà pai-thîaw thá-lee",
                "english": "Next month I'm going to the seaside.",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
  {
    id: 'lesson-6',
    pack: "Shopping",
    items: [
          {
                "thai": "ซื้อ",
                "ipa": "sɯ́ɯ",
                "english": "to buy",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขาย",
                "ipa": "khǎay",
                "english": "to sell",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ลอง",
                "ipa": "lɔɔŋ",
                "english": "to try on",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ลด",
                "ipa": "lót",
                "english": "to reduce, to discount",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มี",
                "ipa": "mii",
                "english": "to have",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไม่มี",
                "ipa": "mâi-mii",
                "english": "to not have",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เล็ก",
                "ipa": "lék",
                "english": "small",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ใหญ่",
                "ipa": "yài",
                "english": "big, large",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ถูก",
                "ipa": "thùuk",
                "english": "cheap",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แพง",
                "ipa": "phɛɛŋ",
                "english": "expensive",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เท่าไร",
                "ipa": "thâo-rai",
                "english": "how much, how many",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อะไร",
                "ipa": "ʔà-rai",
                "english": "what",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ได้ไหม",
                "ipa": "dâi-mǎi",
                "english": "can I? is that possible?",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไหม",
                "ipa": "mǎi",
                "english": "question particle",
                "kind": "word",
                "notes": "turns a statement into a yes/no question"
          },
          {
                "thai": "บาท",
                "ipa": "bàat",
                "english": "baht",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เสื้อ",
                "ipa": "sɯ̂a",
                "english": "shirt",
                "kind": "word",
                "notes": "classifier ตัว (tua)"
          },
          {
                "thai": "กางเกง",
                "ipa": "kaaŋ-keeŋ",
                "english": "trousers",
                "kind": "word",
                "notes": "classifier ตัว (tua)"
          },
          {
                "thai": "กระโปรง",
                "ipa": "krà-prooŋ",
                "english": "skirt",
                "kind": "word",
                "notes": "classifier ตัว (tua)"
          },
          {
                "thai": "กระเป๋า",
                "ipa": "krà-pǎo",
                "english": "bag, purse",
                "kind": "word",
                "notes": "classifier ใบ (bai)"
          },
          {
                "thai": "รองเท้า",
                "ipa": "rɔɔŋ-tháo",
                "english": "shoes",
                "kind": "word",
                "notes": "classifier คู่ (khûu), a pair"
          },
          {
                "thai": "ถุงเท้า",
                "ipa": "thǔŋ-tháo",
                "english": "socks",
                "kind": "word",
                "notes": "classifier คู่ (khûu), a pair"
          },
          {
                "thai": "ผ้า",
                "ipa": "phâa",
                "english": "cloth, fabric",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ผ้าเช็ดตัว",
                "ipa": "phâa-chét-tua",
                "english": "towel",
                "kind": "word",
                "notes": "classifier ผืน (phɯ̌ɯn)"
          },
          {
                "thai": "ของ",
                "ipa": "khɔ̌ɔŋ",
                "english": "things, stuff",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปากกา",
                "ipa": "pàak-kaa",
                "english": "pen",
                "kind": "word",
                "notes": "classifier ด้าม (dâam)"
          },
          {
                "thai": "ดินสอ",
                "ipa": "din-sɔ̌ɔ",
                "english": "pencil",
                "kind": "word",
                "notes": "classifier แท่ง (thɛ̂ŋ)"
          },
          {
                "thai": "หนังสือ",
                "ipa": "nǎŋ-sɯ̌ɯ",
                "english": "book",
                "kind": "word",
                "notes": "classifier เล่ม (lêm)"
          },
          {
                "thai": "สมุด",
                "ipa": "sà-mùt",
                "english": "notebook",
                "kind": "word",
                "notes": "classifier เล่ม (lêm)"
          },
          {
                "thai": "สบู่",
                "ipa": "sà-bùu",
                "english": "soap",
                "kind": "word",
                "notes": "classifier ก้อน (kɔ̂ɔn), a bar"
          },
          {
                "thai": "แปรงสีฟัน",
                "ipa": "prɛɛŋ-sǐi-fan",
                "english": "toothbrush",
                "kind": "word",
                "notes": "classifier อัน (ʔan)"
          },
          {
                "thai": "ยาสีฟัน",
                "ipa": "yaa-sǐi-fan",
                "english": "toothpaste",
                "kind": "word",
                "notes": "classifier หลอด (lɔ̀ɔt), a tube"
          },
          {
                "thai": "ยาสระผม",
                "ipa": "yaa-sà-phǒm",
                "english": "shampoo",
                "kind": "word",
                "notes": "classifier ขวด (khùat), a bottle"
          },
          {
                "thai": "ตัว",
                "ipa": "tua",
                "english": "classifier for clothing and animals",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ใบ",
                "ipa": "bai",
                "english": "classifier for bags, containers and leaves",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "คู่",
                "ipa": "khûu",
                "english": "classifier for pairs",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ด้าม",
                "ipa": "dâam",
                "english": "classifier for pens and long handled things",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แท่ง",
                "ipa": "thɛ̂ŋ",
                "english": "classifier for sticks and bars",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เล่ม",
                "ipa": "lêm",
                "english": "classifier for books and notebooks",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ก้อน",
                "ipa": "kɔ̂ɔn",
                "english": "classifier for lumps and bars",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หลอด",
                "ipa": "lɔ̀ɔt",
                "english": "classifier for tubes",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขวด",
                "ipa": "khùat",
                "english": "classifier for bottles",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อัน",
                "ipa": "ʔan",
                "english": "general classifier for small objects",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สี",
                "ipa": "sǐi",
                "english": "colour",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ดำ",
                "ipa": "dam",
                "english": "black",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แดง",
                "ipa": "dɛɛŋ",
                "english": "red",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขาว",
                "ipa": "khǎaw",
                "english": "white",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "น้ำเงิน",
                "ipa": "nám-ŋəən",
                "english": "navy blue",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ฟ้า",
                "ipa": "fáa",
                "english": "light blue",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เหลือง",
                "ipa": "lɯ̌aŋ",
                "english": "yellow",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ส้ม",
                "ipa": "sôm",
                "english": "orange",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เขียว",
                "ipa": "khǐaw",
                "english": "green",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ซื้ออะไรครับ",
                "ipa": "sɯ́ɯ ʔà-rai khráp",
                "english": "What would you like to buy?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "มีเสื้อสีแดงไหมครับ",
                "ipa": "mii sɯ̂a sǐi-dɛɛŋ mǎi khráp",
                "english": "Do you have a red shirt?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ลองได้ไหมครับ",
                "ipa": "lɔɔŋ dâi-mǎi khráp",
                "english": "Can I try it on?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เท่าไรครับ",
                "ipa": "thâo-rai khráp",
                "english": "How much is it?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ลดได้ไหมครับ",
                "ipa": "lót dâi-mǎi khráp",
                "english": "Can you lower the price?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ซื้อเสื้อสามตัว",
                "ipa": "sɯ́ɯ sɯ̂a sǎam tua",
                "english": "Buy three shirts.",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
  {
    id: 'lesson-7',
    pack: "Directions",
    items: [
          {
                "thai": "ขอโทษ",
                "ipa": "khɔ̌ɔ-thôot",
                "english": "excuse me, sorry",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขอบคุณ",
                "ipa": "khɔ̀ɔp-khun",
                "english": "thank you",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไม่เป็นไร",
                "ipa": "mâi-pen-rai",
                "english": "you're welcome, it's nothing",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ร้านหนังสือ",
                "ipa": "ráan-nǎŋ-sɯ̌ɯ",
                "english": "bookshop",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ร้านอาหาร",
                "ipa": "ráan-ʔaa-hǎan",
                "english": "restaurant",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ร้านขายยา",
                "ipa": "ráan-khǎay-yaa",
                "english": "pharmacy",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "โรงหนัง",
                "ipa": "rooŋ-nǎŋ",
                "english": "cinema",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "โรงแรม",
                "ipa": "rooŋ-rɛɛm",
                "english": "hotel",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "โรงพยาบาล",
                "ipa": "rooŋ-phá-yaa-baan",
                "english": "hospital",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ธนาคาร",
                "ipa": "thá-naa-khaan",
                "english": "bank",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไปรษณีย์",
                "ipa": "prai-sà-nii",
                "english": "post office",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สถานีตำรวจ",
                "ipa": "sà-thǎa-nii-tam-rùat",
                "english": "police station",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มหาวิทยาลัย",
                "ipa": "má-hǎa-wít-thá-yaa-lai",
                "english": "university",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ถนน",
                "ipa": "thà-nǒn",
                "english": "road, street",
                "kind": "word",
                "notes": "classifier สาย (sǎay) or เส้น (sên)"
          },
          {
                "thai": "เดินตรงไป",
                "ipa": "dəən-troŋ-pai",
                "english": "to go straight ahead",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เลี้ยวซ้าย",
                "ipa": "líaw-sáay",
                "english": "to turn left",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เลี้ยวขวา",
                "ipa": "líaw-khwǎa",
                "english": "to turn right",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ทางซ้าย",
                "ipa": "thaaŋ-sáay",
                "english": "on the left",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ทางขวา",
                "ipa": "thaaŋ-khwǎa",
                "english": "on the right",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ตรงข้าม",
                "ipa": "troŋ-khâam",
                "english": "opposite, across from",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ระหว่าง",
                "ipa": "rá-wàaŋ",
                "english": "between",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ติดกับ",
                "ipa": "tìt-kàp",
                "english": "next to",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หัวมุม",
                "ipa": "hǔa-mum",
                "english": "on the corner of",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ที่",
                "ipa": "thîi",
                "english": "at",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ใกล้",
                "ipa": "klâi",
                "english": "near, close to",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไกล",
                "ipa": "klai",
                "english": "far",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อยู่",
                "ipa": "yùu",
                "english": "to be located, to live",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เดิน",
                "ipa": "dəən",
                "english": "to walk",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "รถเมล์",
                "ipa": "rót-mee",
                "english": "bus",
                "kind": "word",
                "notes": "classifier คัน (khan)"
          },
          {
                "thai": "รถสองแถว",
                "ipa": "rót-sɔ̌ɔŋ-thɛ̌ɛw",
                "english": "songthaew, shared minibus",
                "kind": "word",
                "notes": "classifier คัน (khan)"
          },
          {
                "thai": "รถไฟฟ้า",
                "ipa": "rót-fai-fáa",
                "english": "skytrain",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "รถตู้",
                "ipa": "rót-tûu",
                "english": "van",
                "kind": "word",
                "notes": "classifier คัน (khan)"
          },
          {
                "thai": "เรือ",
                "ipa": "rɯa",
                "english": "boat",
                "kind": "word",
                "notes": "classifier ลำ (lam)"
          },
          {
                "thai": "เครื่องบิน",
                "ipa": "khrɯ̂aŋ-bin",
                "english": "aeroplane",
                "kind": "word",
                "notes": "classifier ลำ (lam)"
          },
          {
                "thai": "มอเตอร์ไซค์",
                "ipa": "mɔɔ-təə-sai",
                "english": "motorbike",
                "kind": "word",
                "notes": "classifier คัน (khan)"
          },
          {
                "thai": "จักรยาน",
                "ipa": "càk-krà-yaan",
                "english": "bicycle",
                "kind": "word",
                "notes": "classifier คัน (khan)"
          },
          {
                "thai": "นั่ง",
                "ipa": "nâŋ",
                "english": "to sit, to take (transport)",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขึ้น",
                "ipa": "khɯ̂n",
                "english": "to get on, to board",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ลง",
                "ipa": "loŋ",
                "english": "to get off",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สาย",
                "ipa": "sǎay",
                "english": "route, line number",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สะพาน",
                "ipa": "sà-phaan",
                "english": "bridge",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไฟแดง",
                "ipa": "fai-dɛɛŋ",
                "english": "traffic light",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ข้าม",
                "ipa": "khâam",
                "english": "to cross",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขอโทษครับ โรงพยาบาลอยู่ที่ไหนครับ",
                "ipa": "khɔ̌ɔ-thôot khráp rooŋ-phá-yaa-baan yùu thîi-nǎi khráp",
                "english": "Excuse me, where is the hospital?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "โรงพยาบาลอยู่ติดกับมหาวิทยาลัย",
                "ipa": "rooŋ-phá-yaa-baan yùu tìt-kàp má-hǎa-wít-thá-yaa-lai",
                "english": "The hospital is next to the university.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "อยู่ไกลไหมครับ",
                "ipa": "yùu klai mǎi khráp",
                "english": "Is it far?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ไม่ไกลครับ",
                "ipa": "mâi klai khráp",
                "english": "It's not far.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ไปยังไงครับ",
                "ipa": "pai yaŋ-ŋai khráp",
                "english": "How do I get there?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เดินตรงไป แล้วก็เลี้ยวขวา",
                "ipa": "dəən troŋ-pai lɛ́ɛw-kɔ̂ líaw-khwǎa",
                "english": "Walk straight ahead, then turn right.",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
  {
    id: 'lesson-8',
    pack: "Feelings",
    items: [
          {
                "thai": "สบายดี",
                "ipa": "sà-baay-dii",
                "english": "fine, well",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สนุก",
                "ipa": "sà-nùk",
                "english": "fun, enjoyable",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เหนื่อย",
                "ipa": "nɯ̀ay",
                "english": "tired",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ง่วงนอน",
                "ipa": "ŋûaŋ-nɔɔn",
                "english": "sleepy",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เบื่อ",
                "ipa": "bɯ̀a",
                "english": "bored",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อาย",
                "ipa": "ʔaay",
                "english": "shy, embarrassed",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "กลัว",
                "ipa": "klua",
                "english": "afraid, scared",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "โกรธ",
                "ipa": "kròot",
                "english": "angry",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ตื่นเต้น",
                "ipa": "tɯ̀ɯn-tên",
                "english": "excited",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ดีใจ",
                "ipa": "dii-cai",
                "english": "glad, happy",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เสียใจ",
                "ipa": "sǐa-cai",
                "english": "sad, sorry",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ร้อน",
                "ipa": "rɔ́ɔn",
                "english": "hot",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หนาว",
                "ipa": "nǎaw",
                "english": "cold",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขี้เกียจ",
                "ipa": "khîi-kìat",
                "english": "lazy",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ยุ่ง",
                "ipa": "yûŋ",
                "english": "busy",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อิจฉา",
                "ipa": "ʔìt-chǎa",
                "english": "jealous",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เกลียด",
                "ipa": "klìat",
                "english": "to hate",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "รัก",
                "ipa": "rák",
                "english": "to love",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เรียน",
                "ipa": "rian",
                "english": "to study, to learn",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ภาษาไทย",
                "ipa": "phaa-sǎa-thai",
                "english": "the Thai language",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มาก",
                "ipa": "mâak",
                "english": "very, a lot",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "นิดหน่อย",
                "ipa": "nít-nɔ̀y",
                "english": "a little, a bit",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เลย",
                "ipa": "ləəy",
                "english": "at all",
                "kind": "word",
                "notes": "used with a negative: ไม่เหนื่อยเลย (mâi nɯ̀ay ləəy), not tired at all"
          },
          {
                "thai": "แต่",
                "ipa": "tɛ̀ɛ",
                "english": "but",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หรือเปล่า",
                "ipa": "rɯ́-plàaw",
                "english": "…or not?",
                "kind": "word",
                "notes": "a second way to ask a yes/no question"
          },
          {
                "thai": "วันนี้เป็นยังไงบ้าง",
                "ipa": "wan-níi pen-yaŋ-ŋai bâaŋ",
                "english": "How are you today?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "สบายดีครับ แต่ง่วงนอนนิดหน่อย",
                "ipa": "sà-baay-dii khráp tɛ̀ɛ ŋûaŋ-nɔɔn nít-nɔ̀y",
                "english": "I'm fine, but a bit sleepy.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เหนื่อยไหมคะ",
                "ipa": "nɯ̀ay mǎi khá",
                "english": "Are you tired?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ไม่เหนื่อยเลยครับ",
                "ipa": "mâi nɯ̀ay ləəy khráp",
                "english": "I'm not tired at all.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เรียนภาษาไทยสนุกหรือเปล่า",
                "ipa": "rian phaa-sǎa-thai sà-nùk rɯ́-plàaw",
                "english": "Is learning Thai fun?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "สนุกมากครับ",
                "ipa": "sà-nùk mâak khráp",
                "english": "It's a lot of fun.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "วันนี้ร้อนมาก",
                "ipa": "wan-níi rɔ́ɔn mâak",
                "english": "It's very hot today.",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
  {
    id: 'lesson-9',
    pack: "Health",
    items: [
          {
                "thai": "หัว",
                "ipa": "hǔa",
                "english": "head",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ผม",
                "ipa": "phǒm",
                "english": "hair",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ตา",
                "ipa": "taa",
                "english": "eye",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หู",
                "ipa": "hǔu",
                "english": "ear",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "จมูก",
                "ipa": "cà-mùuk",
                "english": "nose",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปาก",
                "ipa": "pàak",
                "english": "mouth",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ฟัน",
                "ipa": "fan",
                "english": "tooth, teeth",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "คอ",
                "ipa": "khɔɔ",
                "english": "neck, throat",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แขน",
                "ipa": "khǎɛn",
                "english": "arm",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มือ",
                "ipa": "mɯɯ",
                "english": "hand",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "นิ้ว",
                "ipa": "níw",
                "english": "finger",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ท้อง",
                "ipa": "thɔ́ɔŋ",
                "english": "stomach, belly",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หลัง",
                "ipa": "lǎŋ",
                "english": "back",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ขา",
                "ipa": "khǎa",
                "english": "leg",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เท้า",
                "ipa": "tháo",
                "english": "foot, feet",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หมอ",
                "ipa": "mɔ̌ɔ",
                "english": "doctor",
                "kind": "word",
                "notes": "classifier คน (khon)"
          },
          {
                "thai": "ยา",
                "ipa": "yaa",
                "english": "medicine",
                "kind": "word",
                "notes": "classifier เม็ด (mét) for tablets"
          },
          {
                "thai": "ไม่สบาย",
                "ipa": "mâi-sà-baay",
                "english": "to be unwell, ill",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เป็นหวัด",
                "ipa": "pen-wàt",
                "english": "to have a cold",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เป็นไข้",
                "ipa": "pen-khâi",
                "english": "to have a fever",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เป็นผื่น",
                "ipa": "pen-phɯ̀ɯn",
                "english": "to have a rash",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปวดหัว",
                "ipa": "pùat-hǔa",
                "english": "to have a headache",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปวดฟัน",
                "ipa": "pùat-fan",
                "english": "to have toothache",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปวดท้อง",
                "ipa": "pùat-thɔ́ɔŋ",
                "english": "to have a stomachache",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปวดหลัง",
                "ipa": "pùat-lǎŋ",
                "english": "to have backache",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เจ็บคอ",
                "ipa": "cèp-khɔɔ",
                "english": "to have a sore throat",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เจ็บตา",
                "ipa": "cèp-taa",
                "english": "to have sore eyes",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไอ",
                "ipa": "ʔai",
                "english": "to cough",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อาเจียน",
                "ipa": "ʔaa-cian",
                "english": "to vomit",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ท้องเสีย",
                "ipa": "thɔ́ɔŋ-sǐa",
                "english": "to have diarrhoea",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "กินยา",
                "ipa": "kin-yaa",
                "english": "to take medicine",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไปหาหมอ",
                "ipa": "pai-hǎa-mɔ̌ɔ",
                "english": "to go and see a doctor",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "พักผ่อน",
                "ipa": "phák-phɔ̀n",
                "english": "to rest",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ดื่มน้ำ",
                "ipa": "dɯ̀ɯm-náam",
                "english": "to drink water",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ต้อง",
                "ipa": "tɔ̂ŋ",
                "english": "must, have to",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไม่ค่อย",
                "ipa": "mâi-khɔ̂y",
                "english": "not very, not really",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หรือยัง",
                "ipa": "rɯ́-yaŋ",
                "english": "…yet?",
                "kind": "word",
                "notes": "put at the end of a sentence to ask whether something has happened yet"
          },
          {
                "thai": "ยัง",
                "ipa": "yaŋ",
                "english": "not yet",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แล้ว",
                "ipa": "lɛ́ɛw",
                "english": "already",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ผมไม่ค่อยสบายครับ",
                "ipa": "phǒm mâi-khɔ̂y sà-baay khráp",
                "english": "I'm not feeling very well.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เป็นอะไรคะ",
                "ipa": "pen ʔà-rai khá",
                "english": "What's wrong?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ผมเจ็บคอ แล้วก็เป็นไข้ครับ",
                "ipa": "phǒm cèp-khɔɔ lɛ́ɛw-kɔ̂ pen-khâi khráp",
                "english": "I have a sore throat and a fever.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ไปหาหมอหรือยังคะ",
                "ipa": "pai-hǎa-mɔ̌ɔ rɯ́-yaŋ khá",
                "english": "Have you seen a doctor yet?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ยังไม่ได้ไปครับ",
                "ipa": "yaŋ-mâi-dâi pai khráp",
                "english": "I haven't been yet.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "คุณต้องพักผ่อน",
                "ipa": "khun tɔ̂ŋ phák-phɔ̀n",
                "english": "You have to rest.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "คุณกินข้าวหรือยัง",
                "ipa": "khun kin-khâaw rɯ́-yaŋ",
                "english": "Have you eaten yet?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "หายไวๆ นะคะ",
                "ipa": "hǎay wai-wai ná-khá",
                "english": "Get well soon.",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
  {
    id: 'notes-hotel',
    pack: "Hotel and staying",
    items: [
          {
                "thai": "จอง",
                "ipa": "cɔɔŋ",
                "english": "to book, to reserve",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ห้อง",
                "ipa": "hɔ̂ŋ",
                "english": "room",
                "kind": "word",
                "notes": "classifier ห้อง (hɔ̂ŋ) — the word is its own classifier"
          },
          {
                "thai": "เช็คอิน",
                "ipa": "chék-ʔin",
                "english": "to check in",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สำหรับ",
                "ipa": "sǎm-ràp",
                "english": "for",
                "kind": "word",
                "notes": "ห้องสำหรับสองคน (hɔ̂ŋ sǎm-ràp sɔ̌ɔŋ khon) = a room for two"
          },
          {
                "thai": "หมายเลขห้อง",
                "ipa": "mǎay-lêek-hɔ̂ŋ",
                "english": "room number",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สักครู่",
                "ipa": "sàk-khrûu",
                "english": "just a moment",
                "kind": "word",
                "notes": "รอสักครู่ (rɔɔ sàk-khrûu) = wait a moment"
          },
          {
                "thai": "นี่",
                "ipa": "nîi",
                "english": "this, here you go",
                "kind": "word",
                "notes": "said when handing something over"
          },
          {
                "thai": "ทราบ",
                "ipa": "sâap",
                "english": "to know",
                "kind": "word",
                "notes": "the polite word for รู้ (rúu); used with staff and strangers"
          },
          {
                "thai": "กุญแจ",
                "ipa": "kun-cɛɛ",
                "english": "key",
                "kind": "word",
                "notes": "classifier ดอก (dɔ̀ɔk)"
          },
          {
                "thai": "ต้องการ",
                "ipa": "tɔ̂ŋ-kaan",
                "english": "to want, to need",
                "kind": "word",
                "notes": "more formal than อยาก (yàak)"
          },
          {
                "thai": "ชั้น",
                "ipa": "chán",
                "english": "floor, storey",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เย็น",
                "ipa": "yen",
                "english": "cool",
                "kind": "word",
                "notes": "also means late afternoon or early evening"
          },
          {
                "thai": "รับ",
                "ipa": "ráp",
                "english": "to receive, to take",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เพิ่ม",
                "ipa": "phə̂əm",
                "english": "to add, more",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ใส่",
                "ipa": "sài",
                "english": "to put in, to add, to wear",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "พูด",
                "ipa": "phûut",
                "english": "to speak, to say",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อีกครั้ง",
                "ipa": "ʔìik khráŋ",
                "english": "one more time",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ครั้ง",
                "ipa": "khráŋ",
                "english": "time, occasion",
                "kind": "word",
                "notes": "also the classifier for counting occurrences"
          },
          {
                "thai": "สมาชิก",
                "ipa": "sà-maa-chík",
                "english": "member",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สมัคร",
                "ipa": "sà-màk",
                "english": "to apply, to sign up",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เติม",
                "ipa": "təəm",
                "english": "to fill up, to top up",
                "kind": "word",
                "notes": "เติมน้ำมัน (təəm nám-man) = to fill up with petrol"
          },
          {
                "thai": "เต็ม",
                "ipa": "tem",
                "english": "full",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ถัง",
                "ipa": "thǎŋ",
                "english": "tank, bucket",
                "kind": "word",
                "notes": "also the classifier for tank-sized containers"
          },
          {
                "thai": "เมื่อกี้",
                "ipa": "mɯ̂a-kîi",
                "english": "a moment ago",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มีห้องว่างไหมครับ",
                "ipa": "mii hɔ̂ŋ wâaŋ mǎi khráp",
                "english": "Do you have a room available?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ขอกุญแจห้องครับ",
                "ipa": "khɔ̌ɔ kun-cɛɛ hɔ̂ŋ khráp",
                "english": "May I have the room key?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "รอสักครู่นะคะ",
                "ipa": "rɔɔ sàk-khrûu ná-khá",
                "english": "Just a moment, please.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "พูดอีกครั้งได้ไหมครับ",
                "ipa": "phûut ʔìik khráŋ dâi-mǎi khráp",
                "english": "Could you say that again?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ไม่ใส่อะไรเลย",
                "ipa": "mâi sài ʔà-rai ləəy",
                "english": "Don't add anything at all.",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
  {
    id: 'notes-home',
    pack: "Home and furniture",
    items: [
          {
                "thai": "เฟอร์นิเจอร์",
                "ipa": "fəə-ní-cəə",
                "english": "furniture",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เก้าอี้",
                "ipa": "kâo-ʔîi",
                "english": "chair",
                "kind": "word",
                "notes": "classifier ตัว (tua)"
          },
          {
                "thai": "โต๊ะ",
                "ipa": "tó",
                "english": "table",
                "kind": "word",
                "notes": "classifier ตัว (tua)"
          },
          {
                "thai": "โคมไฟ",
                "ipa": "khoom-fai",
                "english": "lamp",
                "kind": "word",
                "notes": "classifier อัน (ʔan) or ตัว (tua)"
          },
          {
                "thai": "หลอดไฟ",
                "ipa": "lɔ̀ɔt-fai",
                "english": "light bulb",
                "kind": "word",
                "notes": "classifier หลอด (lɔ̀ɔt), the same word as the tube"
          },
          {
                "thai": "พรม",
                "ipa": "phrom",
                "english": "carpet, rug",
                "kind": "word",
                "notes": "classifier ผืน (phɯ̌ɯn), used for flat woven things"
          },
          {
                "thai": "หมอน",
                "ipa": "mɔ̌ɔn",
                "english": "pillow",
                "kind": "word",
                "notes": "classifier ใบ (bai)"
          },
          {
                "thai": "ปลอกหมอน",
                "ipa": "plɔ̀ɔk-mɔ̌ɔn",
                "english": "pillowcase",
                "kind": "word",
                "notes": "classifier ใบ (bai)"
          },
          {
                "thai": "โซฟา",
                "ipa": "soo-faa",
                "english": "sofa",
                "kind": "word",
                "notes": "classifier ตัว (tua)"
          },
          {
                "thai": "ชั้นวางของ",
                "ipa": "chán-waaŋ-khɔ̌ɔŋ",
                "english": "shelf",
                "kind": "word",
                "notes": "literally \"floor for placing things\""
          },
          {
                "thai": "ประตู",
                "ipa": "prà-tuu",
                "english": "door, gate",
                "kind": "word",
                "notes": "classifier บาน (baan)"
          },
          {
                "thai": "มือหนึ่ง",
                "ipa": "mɯɯ-nɯ̀ŋ",
                "english": "brand new, first-hand",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มือสอง",
                "ipa": "mɯɯ-sɔ̌ɔŋ",
                "english": "second-hand",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วาง",
                "ipa": "waaŋ",
                "english": "to put down, to place",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไว้",
                "ipa": "wái",
                "english": "to leave, to keep",
                "kind": "word",
                "notes": "goes after a verb: วางไว้ (waaŋ wái) = leave it there"
          },
          {
                "thai": "ข้างใน",
                "ipa": "khâaŋ-nai",
                "english": "inside",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ข้างนอก",
                "ipa": "khâaŋ-nɔ̂ɔk",
                "english": "outside",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ข้างหน้า",
                "ipa": "khâaŋ-nâa",
                "english": "in front",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ข้างหลัง",
                "ipa": "khâaŋ-lǎŋ",
                "english": "behind",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ข้างบน",
                "ipa": "khâaŋ-bon",
                "english": "above, upstairs",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ข้างล่าง",
                "ipa": "khâaŋ-lâaŋ",
                "english": "below, downstairs",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "สีเทา",
                "ipa": "sǐi-thao",
                "english": "grey",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ผืน",
                "ipa": "phɯ̌ɯn",
                "english": "classifier for cloth, carpets and towels",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ต้น",
                "ipa": "tôn",
                "english": "classifier for trees and plants",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ดอก",
                "ipa": "dɔ̀ɔk",
                "english": "classifier for flowers and keys",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เรือน",
                "ipa": "rɯan",
                "english": "classifier for clocks and houses",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "บาน",
                "ipa": "baan",
                "english": "classifier for doors and windows",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "คัน",
                "ipa": "khan",
                "english": "classifier for vehicles",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ลำ",
                "ipa": "lam",
                "english": "classifier for boats and aircraft",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "คน",
                "ipa": "khon",
                "english": "person",
                "kind": "word",
                "notes": "also the classifier for people"
          },
          {
                "thai": "เม็ด",
                "ipa": "mét",
                "english": "classifier for tablets, pills and seeds",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "วางไว้ข้างในประตูสีเทา",
                "ipa": "waaŋ wái khâaŋ-nai prà-tuu sǐi-thao",
                "english": "Leave it inside the grey gate.",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
  {
    id: 'notes-everyday',
    pack: "Everyday extras",
    items: [
          {
                "thai": "ดื่ม",
                "ipa": "dɯ̀ɯm",
                "english": "to drink",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มา",
                "ipa": "maa",
                "english": "to come",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ครึ่ง",
                "ipa": "khrɯ̂ŋ",
                "english": "half",
                "kind": "word",
                "notes": "ชั่วโมงครึ่ง (chûa-mooŋ khrɯ̂ŋ) = an hour and a half"
          },
          {
                "thai": "วันที่",
                "ipa": "wan-thîi",
                "english": "date",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปิด",
                "ipa": "pìt",
                "english": "to close, to turn off",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เปิด",
                "ipa": "pə̀ət",
                "english": "to open, to turn on",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ปลูก",
                "ipa": "plùuk",
                "english": "to plant, to grow",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ดอกไม้",
                "ipa": "dɔ̀ɔk-máai",
                "english": "flower",
                "kind": "word",
                "notes": "classifier ดอก (dɔ̀ɔk)"
          },
          {
                "thai": "ต้นไม้",
                "ipa": "tôn-máai",
                "english": "tree, plant",
                "kind": "word",
                "notes": "classifier ต้น (tôn)"
          },
          {
                "thai": "ใบเสร็จ",
                "ipa": "bai-sèt",
                "english": "receipt",
                "kind": "word",
                "notes": "classifier ใบ (bai)"
          },
          {
                "thai": "ว่าง",
                "ipa": "wâaŋ",
                "english": "free, vacant, available",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไม่ว่าง",
                "ipa": "mâi-wâaŋ",
                "english": "busy, not available",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "มะรืนนี้",
                "ipa": "má-rɯɯn-níi",
                "english": "the day after tomorrow",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "นวด",
                "ipa": "nûat",
                "english": "massage, to massage",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ทำเล็บ",
                "ipa": "tham-lép",
                "english": "to have one's nails done",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เล็บ",
                "ipa": "lép",
                "english": "nail",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เมื่อไหร่",
                "ipa": "mɯ̂a-rài",
                "english": "when",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ราคา",
                "ipa": "raa-khaa",
                "english": "price",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ออกกำลังกาย",
                "ipa": "ʔɔ̀ɔk-kam-laŋ-kaay",
                "english": "to exercise, to work out",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ต่อ",
                "ipa": "tɔ̀ɔ",
                "english": "per",
                "kind": "word",
                "notes": "กี่ครั้งต่อวัน (kìi khráŋ tɔ̀ɔ wan) = how many times per day"
          },
          {
                "thai": "กี่",
                "ipa": "kìi",
                "english": "how many",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "กิโล",
                "ipa": "kì-loo",
                "english": "kilometre, kilogram",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เมตร",
                "ipa": "méet",
                "english": "metre",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ชั่วโมง",
                "ipa": "chûa-mooŋ",
                "english": "hour",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "นาที",
                "ipa": "naa-thii",
                "english": "minute",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "อีก",
                "ipa": "ʔìik",
                "english": "more, again, another",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ถึง",
                "ipa": "thɯ̌ŋ",
                "english": "to arrive, to reach, until",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ห่าง",
                "ipa": "hàaŋ",
                "english": "far apart, distant",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ก่อน",
                "ipa": "kɔ̀ɔn",
                "english": "before, first",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แยก",
                "ipa": "yɛ̂ɛk",
                "english": "junction, intersection",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เรื่อยๆ",
                "ipa": "rɯ̂ay-rɯ̂ay",
                "english": "steadily, keep on doing",
                "kind": "word",
                "notes": "เดินเรื่อยๆ (dəən rɯ̂ay-rɯ̂ay) = keep walking"
          },
          {
                "thai": "สวนสาธารณะ",
                "ipa": "sǔan-sǎa-thaa-rá-ná",
                "english": "public park",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "โทร",
                "ipa": "thoo",
                "english": "to phone, to call",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "โทรศัพท์",
                "ipa": "thoo-rá-sàp",
                "english": "telephone",
                "kind": "word",
                "notes": "classifier เครื่อง (khrɯ̂aŋ)"
          },
          {
                "thai": "นาฬิกา",
                "ipa": "naa-lí-kaa",
                "english": "watch, clock",
                "kind": "word",
                "notes": "classifier เรือน (rɯan)"
          },
          {
                "thai": "ตุ้มหู",
                "ipa": "tûm-hǔu",
                "english": "earring",
                "kind": "word",
                "notes": "classifier คู่ (khûu) for a pair"
          },
          {
                "thai": "หลากหลาย",
                "ipa": "làak-lǎay",
                "english": "varied, many different",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หลายอย่าง",
                "ipa": "lǎay-yàaŋ",
                "english": "many kinds of things",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หายาก",
                "ipa": "hǎa-yâak",
                "english": "hard to find",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ธุระ",
                "ipa": "thú-rá",
                "english": "errand, business to attend to",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ไปธุระ",
                "ipa": "pai-thú-rá",
                "english": "to run an errand",
                "kind": "word",
                "notes": "a polite non-answer to \"where are you going?\""
          },
          {
                "thai": "ใจ",
                "ipa": "cai",
                "english": "heart, mind",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ใจดี",
                "ipa": "cai-dii",
                "english": "kind, good-hearted",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ใจร้าย",
                "ipa": "cai-ráay",
                "english": "mean, cruel",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หรือว่า",
                "ipa": "rɯ̌ɯ-wâa",
                "english": "or",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ยาแก้ปวด",
                "ipa": "yaa-kɛ̂ɛ-pùat",
                "english": "painkiller",
                "kind": "word",
                "notes": "literally \"medicine that cures aches\""
          },
          {
                "thai": "ฉีดยา",
                "ipa": "chìit-yaa",
                "english": "to give an injection",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ผ่าตัด",
                "ipa": "phàa-tàt",
                "english": "to operate, surgery",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "แก้ม",
                "ipa": "kɛ̂ɛm",
                "english": "cheek",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "คิ้ว",
                "ipa": "khíw",
                "english": "eyebrow",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "หาย",
                "ipa": "hǎay",
                "english": "to recover, to get better",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ให้",
                "ipa": "hâi",
                "english": "to give",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "เครื่อง",
                "ipa": "khrɯ̂aŋ",
                "english": "classifier for machines and appliances",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "ร้านขายของ",
                "ipa": "ráan-khǎay-khɔ̌ɔŋ",
                "english": "grocery shop",
                "kind": "word",
                "notes": null
          },
          {
                "thai": "กี่ครั้งต่อวัน",
                "ipa": "kìi khráŋ tɔ̀ɔ wan",
                "english": "How many times a day?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ราคาเท่าไหร่",
                "ipa": "raa-khaa thâo-rài",
                "english": "How much does it cost?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "เมื่อไหร่จะมา",
                "ipa": "mɯ̂a-rài cà maa",
                "english": "When are you coming?",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "อีกห้านาทีถึง",
                "ipa": "ʔìik hâa naa-thii thɯ̌ŋ",
                "english": "Five more minutes until I arrive.",
                "kind": "phrase",
                "notes": null
          },
          {
                "thai": "ไปออกกำลังกาย",
                "ipa": "pai ʔɔ̀ɔk-kam-laŋ-kaay",
                "english": "to go and work out",
                "kind": "phrase",
                "notes": null
          }
    ],
  },
]

export const LESSON_ITEM_COUNT = 364
