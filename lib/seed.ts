import type { DbState } from "./types";
import { randomSecret } from "./crypto";

export function seedState(): DbState {
  return {
    settings: {
      cafeName: "Barakat",
      currency: "грн",
      serviceFeePercent: 0,
      receiptHeader: "Кафе узбецької кухні\nвул. Глибочицька, 28\n+380 93 022-99-53",
      receiptFooter: "Дякуємо! Смачного!",
      autoPrintKitchen: true,
      paperMm: 80,
      branchesText:
        "вул. Глибочицька, 28 | +380 93 022-99-53 | 9:00–21:00\nвул. Оленівська, 5 | +380 93 209-97-75 | 9:00–22:00",
      aboutText: "Плов, манти, самса, лагман — смак традицій Узбекистану. Ваш затишний куточок Сходу, ласкаво просимо!",
      instagram: "barakat.kyiv",
      aiGreeting:
        "Вітаємо в кафе «Баракат»! Я AI-оператор, прийму ваше замовлення. Що вам принести?",
      aiVoiceLang: "uk-UA",
      aiEnabled: true,
      aiSystemExtra: "",
    },
    counter: 3,
    authSecret: randomSecret(),
    // Parol qo'yilmagan: birinchi kirishda /login sahifasida admin parolini o'rnatasiz.
    staff: [{ id: "s1", name: "Administrator", role: "admin", login: "admin", passHash: "", active: true }],
    tables: [
      { id: "t1", name: "1", hall: "Asosiy zal", shape: "circle", x: 20, y: 20, w: 80, h: 80, seats: 2 },
      { id: "t2", name: "2", hall: "Asosiy zal", shape: "circle", x: 175, y: 20, w: 80, h: 80, seats: 2 },
      { id: "t6", name: "6", hall: "Asosiy zal", shape: "rect", x: 330, y: 18, w: 160, h: 90, seats: 4 },
      { id: "tbar", name: "Bar", hall: "Asosiy zal", shape: "bar", x: 610, y: 18, w: 80, h: 390, seats: 6 },
      { id: "t3", name: "3", hall: "Asosiy zal", shape: "oval", x: 40, y: 175, w: 195, h: 80, seats: 6 },
      { id: "t7", name: "7", hall: "Asosiy zal", shape: "rect", x: 330, y: 168, w: 160, h: 90, seats: 4 },
      { id: "t4", name: "4", hall: "Asosiy zal", shape: "circle", x: 20, y: 315, w: 80, h: 80, seats: 2 },
      { id: "t5", name: "5", hall: "Asosiy zal", shape: "circle", x: 175, y: 315, w: 80, h: 80, seats: 2 },
      { id: "t8", name: "8", hall: "Asosiy zal", shape: "rect", x: 330, y: 318, w: 160, h: 90, seats: 4 },
    ],
    categories: [
      { id: "c1", name: "Перші страви", color: "#c0392b", icon: "utensils", sort: 1 },
      { id: "c2", name: "Другі страви", color: "#d9812c", icon: "chef", sort: 2 },
      { id: "c3", name: "Самса та хліб", color: "#b8863b", icon: "cake", sort: 3 },
      { id: "c4", name: "Напої", color: "#2f7f78", icon: "coffee", sort: 4 },
      { id: "c5", name: "Десерти", color: "#a8456b", icon: "cake", sort: 5 },
    ],
    products: [
      { id: "p1", categoryId: "c1", name: "Лагман", price: 190, unit: "порція", toKitchen: true, active: true },
      { id: "p2", categoryId: "c1", name: "Мастава", price: 160, unit: "порція", toKitchen: true, active: true },
      { id: "p3", categoryId: "c1", name: "Шурпа", price: 210, unit: "порція", toKitchen: true, active: true },
      { id: "p4", categoryId: "c1", name: "Чучвара", price: 170, unit: "порція", toKitchen: true, active: true },
      { id: "p5", categoryId: "c2", name: "Плов", price: 200, unit: "порція", toKitchen: true, active: true },
      { id: "p6", categoryId: "c2", name: "Манти (5 шт)", price: 190, unit: "порція", toKitchen: true, active: true },
      { id: "p7", categoryId: "c2", name: "Шашлик з баранини", price: 120, unit: "шпажка", toKitchen: true, active: true },
      { id: "p8", categoryId: "c2", name: "Шашлик з курки", price: 95, unit: "шпажка", toKitchen: true, active: true },
      { id: "p9", categoryId: "c2", name: "Димлама", price: 230, unit: "порція", toKitchen: true, active: true },
      { id: "p10", categoryId: "c2", name: "Ачичук (салат)", price: 80, unit: "порція", toKitchen: true, active: true },
      { id: "p11", categoryId: "c3", name: "Самса з м'ясом", price: 75, unit: "шт", toKitchen: true, active: true },
      { id: "p12", categoryId: "c3", name: "Самса з гарбузом", price: 65, unit: "шт", toKitchen: true, active: true },
      { id: "p13", categoryId: "c3", name: "Тандирний хліб", price: 30, unit: "шт", toKitchen: true, active: true },
      { id: "p14", categoryId: "c3", name: "Патир", price: 45, unit: "шт", toKitchen: true, active: true },
      { id: "p15", categoryId: "c4", name: "Чай чорний (чайник)", price: 70, unit: "шт", toKitchen: false, active: true },
      { id: "p16", categoryId: "c4", name: "Чай зелений (чайник)", price: 70, unit: "шт", toKitchen: false, active: true },
      { id: "p17", categoryId: "c4", name: "Компот", price: 45, unit: "шт", toKitchen: false, active: true },
      { id: "p18", categoryId: "c4", name: "Кава американо", price: 60, unit: "шт", toKitchen: false, active: true },
      { id: "p19", categoryId: "c4", name: "Мінеральна вода 0.5", price: 35, unit: "шт", toKitchen: false, active: true },
      { id: "p20", categoryId: "c5", name: "Чак-чак", price: 85, unit: "порція", toKitchen: false, active: true },
      { id: "p21", categoryId: "c5", name: "Халва", price: 70, unit: "порція", toKitchen: false, active: true },
      { id: "p22", categoryId: "c5", name: "Наполеон", price: 90, unit: "шт", toKitchen: false, active: true },
    ],
    orders: [],
    conversations: [],
  };
}
