"use client";

import { useEffect, useState } from "react";

export type PubLang = "uk" | "ru" | "uz";

export const T = {
  uk: {
    menu: "Меню", branches: "Заклади", order: "Як замовити", call: "Замовити голосом",
    heroTitle: "Справжня узбецька кухня у Києві",
    heroMenu: "Дивитись меню", heroCall: "Зателефонувати", heroAi: "Замовити через AI-оператора",
    facts: ["Щодня з 9:00", "Два заклади у Києві", "Плов · Манти · Самса · Лагман"],
    dishesTitle: "Те, за що нас люблять",
    dishes: [
      { k: "плов", t: "Плов", d: "Розсипчастий рис, ніжне м'ясо, морква й спеції — готуємо у казані." },
      { k: "манти", t: "Манти", d: "Соковиті пельмені на пару з м'ясною начинкою." },
      { k: "самса", t: "Самса", d: "Хрустке листкове тісто й гаряча начинка, просто з тандиру." },
      { k: "лагман", t: "Лагман", d: "Домашня лапша, овочі та насичений ароматний соус." },
    ],
    from: "від",
    menuTitle: "Меню", fullMenu: "Усе меню та замовлення",
    branchesTitle: "Де нас знайти", route: "Маршрут", callBranch: "Зателефонувати",
    howTitle: "Як зробити замовлення",
    how: [
      { t: "Оберіть у меню", d: "Відкрийте меню на телефоні або скануйте QR-код на столі й додайте страви." },
      { t: "Або зателефонуйте", d: "AI-оператор прийме замовлення українською, російською та іншими мовами." },
      { t: "Ми підтвердимо", d: "Касир перевіряє замовлення, і кухня одразу починає готувати." },
    ],
    footer: "Кафе узбецької кухні",
    // katalog
    search: "Пошук страви", all: "Усі", cart: "Кошик", yourOrder: "Ваше замовлення", total: "Разом",
    name: "Ваше ім'я", phone: "Телефон", comment: "Коментар (необов'язково)", send: "Оформити замовлення",
    sending: "Надсилаємо…", back: "Повернутись до меню", close: "Закрити", ok: "Замовлення прийнято",
    okText: "Касир підтвердить його, і кухня почне готувати.", tableFor: "Замовлення для столу",
    empty: "Нічого не знайдено", pcs: "шт",
    // call
    callTitle: "Замовлення по телефону з AI-оператором",
    callSub: "Просто розкажіть, що бажаєте замовити — оператор уточнить і передасть касиру.",
    callSteps: ["Натисніть «Зателефонувати» і дозвольте мікрофон", "Говоріть природно, будь-якою зручною мовою", "Скажіть «це все» — замовлення піде на касу"],
    start: "Зателефонувати", language: "Мова", yourPhone: "Ваш телефон (необов'язково)",
    recNote: "Розмова записується для контролю якості.", end: "Завершити",
    idle: "Готовий до розмови", speaking: "Оператор говорить", listening: "Слухаю вас", thinking: "Думаю…", done: "Розмову завершено",
    typeHere: "Або напишіть тут…", cartTitle: "Ваше замовлення", newCall: "Нова розмова",
    ordered: "Замовлення надіслано на касу", notOrdered: "Замовлення не оформлено",
  },
  ru: {
    menu: "Меню", branches: "Заведения", order: "Как заказать", call: "Заказать голосом",
    heroTitle: "Настоящая узбекская кухня в Киеве",
    heroMenu: "Смотреть меню", heroCall: "Позвонить", heroAi: "Заказать через AI-оператора",
    facts: ["Ежедневно с 9:00", "Два заведения в Киеве", "Плов · Манты · Самса · Лагман"],
    dishesTitle: "За что нас любят",
    dishes: [
      { k: "плов", t: "Плов", d: "Рассыпчатый рис, нежное мясо, морковь и специи — готовим в казане." },
      { k: "манти", t: "Манты", d: "Сочные паровые пельмени с мясной начинкой." },
      { k: "самса", t: "Самса", d: "Хрустящее слоёное тесто и горячая начинка, прямо из тандыра." },
      { k: "лагман", t: "Лагман", d: "Домашняя лапша, овощи и насыщенный ароматный соус." },
    ],
    from: "от",
    menuTitle: "Меню", fullMenu: "Всё меню и заказ",
    branchesTitle: "Где нас найти", route: "Маршрут", callBranch: "Позвонить",
    howTitle: "Как сделать заказ",
    how: [
      { t: "Выберите в меню", d: "Откройте меню на телефоне или отсканируйте QR-код на столе и добавьте блюда." },
      { t: "Или позвоните", d: "AI-оператор примет заказ на украинском, русском и других языках." },
      { t: "Мы подтвердим", d: "Кассир проверяет заказ, и кухня сразу начинает готовить." },
    ],
    footer: "Кафе узбекской кухни",
    search: "Поиск блюда", all: "Все", cart: "Корзина", yourOrder: "Ваш заказ", total: "Итого",
    name: "Ваше имя", phone: "Телефон", comment: "Комментарий (необязательно)", send: "Оформить заказ",
    sending: "Отправляем…", back: "Вернуться в меню", close: "Закрыть", ok: "Заказ принят",
    okText: "Кассир подтвердит его, и кухня начнёт готовить.", tableFor: "Заказ для стола",
    empty: "Ничего не найдено", pcs: "шт",
    callTitle: "Заказ по телефону с AI-оператором",
    callSub: "Просто расскажите, что хотите заказать — оператор уточнит и передаст кассиру.",
    callSteps: ["Нажмите «Позвонить» и разрешите микрофон", "Говорите естественно, на удобном языке", "Скажите «это всё» — заказ уйдёт на кассу"],
    start: "Позвонить", language: "Язык", yourPhone: "Ваш телефон (необязательно)",
    recNote: "Разговор записывается для контроля качества.", end: "Завершить",
    idle: "Готов к разговору", speaking: "Оператор говорит", listening: "Слушаю вас", thinking: "Думаю…", done: "Разговор завершён",
    typeHere: "Или напишите здесь…", cartTitle: "Ваш заказ", newCall: "Новый разговор",
    ordered: "Заказ отправлен на кассу", notOrdered: "Заказ не оформлен",
  },
  uz: {
    menu: "Menyu", branches: "Filiallar", order: "Qanday buyurtma beriladi", call: "Ovoz bilan buyurtma",
    heroTitle: "Kiyevda haqiqiy o'zbek oshxonasi",
    heroMenu: "Menyuni ko'rish", heroCall: "Qo'ng'iroq qilish", heroAi: "AI-operator orqali buyurtma",
    facts: ["Har kuni 9:00 dan", "Kiyevda ikkita filial", "Osh · Manti · Somsa · Lag'mon"],
    dishesTitle: "Bizni yaxshi ko'rishadi",
    dishes: [
      { k: "плов", t: "Osh", d: "Sochiluvchan guruch, yumshoq go'sht, sabzi va ziravorlar — qozonda pishiramiz." },
      { k: "манти", t: "Manti", d: "Go'shtli nozik bug'da pishgan manti." },
      { k: "самса", t: "Somsa", d: "Qarsildoq qatlamli xamir va issiq ichi, to'g'ri tandirdan." },
      { k: "лагман", t: "Lag'mon", d: "Uy lag'moni, sabzavotlar va to'yimli xushbo'y sous." },
    ],
    from: "dan",
    menuTitle: "Menyu", fullMenu: "Butun menyu va buyurtma",
    branchesTitle: "Bizni qayerdan topasiz", route: "Yo'nalish", callBranch: "Qo'ng'iroq qilish",
    howTitle: "Buyurtma qanday beriladi",
    how: [
      { t: "Menyudan tanlang", d: "Telefonda menyuni oching yoki stoldagi QR-kodni skanerlang va taomlarni qo'shing." },
      { t: "Yoki qo'ng'iroq qiling", d: "AI-operator buyurtmani o'zbek, ukrain, rus va boshqa tillarda qabul qiladi." },
      { t: "Biz tasdiqlaymiz", d: "Kassir buyurtmani tekshiradi va oshxona darhol pishirishni boshlaydi." },
    ],
    footer: "O'zbek oshxonasi kafesi",
    search: "Taom qidirish", all: "Hammasi", cart: "Savat", yourOrder: "Buyurtmangiz", total: "Jami",
    name: "Ismingiz", phone: "Telefon", comment: "Izoh (ixtiyoriy)", send: "Buyurtma berish",
    sending: "Yuborilmoqda…", back: "Menyuga qaytish", close: "Yopish", ok: "Buyurtma qabul qilindi",
    okText: "Kassir tasdiqlaydi va oshxona pishirishni boshlaydi.", tableFor: "Stol uchun buyurtma",
    empty: "Hech narsa topilmadi", pcs: "ta",
    callTitle: "AI-operator bilan telefon orqali buyurtma",
    callSub: "Nima buyurtma qilmoqchi ekaningizni ayting — operator aniqlashtiradi va kassirga uzatadi.",
    callSteps: ["«Qo'ng'iroq qilish» ni bosing va mikrofonga ruxsat bering", "O'zingizga qulay tilda tabiiy gapiring", "«Hammasi shu» deng — buyurtma kassaga ketadi"],
    start: "Qo'ng'iroq qilish", language: "Til", yourPhone: "Telefon raqamingiz (ixtiyoriy)",
    recNote: "Suhbat sifat nazorati uchun yozib olinadi.", end: "Tugatish",
    idle: "Suhbatga tayyor", speaking: "Operator gapirmoqda", listening: "Sizni tinglayapman", thinking: "O'ylayapman…", done: "Suhbat tugadi",
    typeHere: "Yoki shu yerga yozing…", cartTitle: "Buyurtmangiz", newCall: "Yangi suhbat",
    ordered: "Buyurtma kassaga yuborildi", notOrdered: "Buyurtma rasmiylashtirilmadi",
  },
} as const;

export function usePubLang(): [PubLang, (l: PubLang) => void] {
  const [lang, setLang] = useState<PubLang>("uk");
  useEffect(() => {
    try {
      const l = localStorage.getItem("pubLang");
      if (l === "ru" || l === "uk" || l === "uz") setLang(l);
    } catch {}
  }, []);
  const set = (l: PubLang) => {
    setLang(l);
    try {
      localStorage.setItem("pubLang", l);
    } catch {}
  };
  return [lang, set];
}
