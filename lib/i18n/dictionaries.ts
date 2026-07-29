import type { Locale } from "./types";

const spanishDictionary = {
  title: "Cubo Mágico 3D",
  description:
    "Desordenalo, resolvelo y descubrí por qué este clásico se siente mejor en tus manos.",
  scramble: "Desordenar cubo",
  purchase: "Comprar cubo",
  help: "Arrastrá una pieza para girar su capa. Arrastrá el fondo para explorar.",
  success: "Lo resolviste.",
  successSecondary: "Ahora llevá el desafío a tus manos.",
  successPurchase: "Comprar ahora",
  controlsShow: "Mostrar controles por capa",
  controlsHide: "Ocultar controles por capa",
  controlsGroup: "Giros por capa",
  faceRight: "Derecha",
  faceLeft: "Izquierda",
  faceUp: "Superior",
  faceDown: "Inferior",
  faceFront: "Frontal",
  faceBack: "Trasera",
  faceMiddle: "Centro vertical",
  faceEquator: "Centro horizontal",
  faceStanding: "Centro frontal",
  directionClockwise: "horario",
  directionCounterclockwise: "antihorario",
  whatsappMessage:
    "Hola 👋 Quiero comprar el Cubo Mágico 3D 🧩 ¿Podrían confirmarme el precio, la disponibilidad y las opciones de entrega?",
} as const;

type DictionaryKeys = keyof typeof spanishDictionary;

export const dictionaries = {
  es: spanishDictionary,
  pt: {
    title: "Cubo Mágico 3D",
    description:
      "Embaralhe, resolva e descubra por que este clássico fica ainda melhor nas suas mãos.",
    scramble: "Embaralhar cubo",
    purchase: "Comprar cubo",
    help: "Arraste uma peça para girar a camada. Arraste o fundo para explorar.",
    success: "Você conseguiu.",
    successSecondary: "Agora leve o desafio para as suas mãos.",
    successPurchase: "Comprar agora",
    controlsShow: "Mostrar controles por camada",
    controlsHide: "Ocultar controles por camada",
    controlsGroup: "Giros por camada",
    faceRight: "Direita",
    faceLeft: "Esquerda",
    faceUp: "Superior",
    faceDown: "Inferior",
    faceFront: "Frontal",
    faceBack: "Traseira",
    faceMiddle: "Centro vertical",
    faceEquator: "Centro horizontal",
    faceStanding: "Centro frontal",
    directionClockwise: "horário",
    directionCounterclockwise: "anti-horário",
    whatsappMessage:
      "Olá 👋 Quero comprar o Cubo Mágico 3D 🧩 Poderiam me confirmar o preço, a disponibilidade e as opções de entrega?",
  } satisfies Record<DictionaryKeys, string>,
} as const satisfies Record<Locale, Record<DictionaryKeys, string>>;
