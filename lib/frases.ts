// Banco de frases en primera persona, tuteo chileno, sin groserías.
// Estructura anidada [animo][especie][tono] con ≥ 5 frases por grupo.
// 6 ánimos × 2 especies × 2 tonos × 5 frases = 120 frases (≥ 120).
// Cada frase ≤ 120 caracteres, validado en runtime al cargar el módulo.

import type { EstadoAnimo, Especie, Tono } from "./types";

type Grupo = Record<Tono, string[]>;
type PorEspecie = Record<Especie, Grupo>;
type Banco = Record<EstadoAnimo, PorEspecie>;

const MAX = 120;

function grp(frases: string[]): string[] {
  for (const s of frases) {
    if (s.length > MAX) {
      throw new Error(`Frase excede ${MAX} chars: "${s}"`);
    }
  }
  return frases.slice();
}

export const FRASES: Banco = {
  jugueton: {
    perro: {
      tierno: grp([
        "¡Alguien tire la pelota otra vez, porfa! Estoy listo para correr hasta el fin del mundo contigo.",
        "Tengo más energía que un carrete en verano: ¡corramos, saltemos y olvidémonos del sofá!",
        "Wiiii, la vida es una fiesta de colitas y zapatillas. Lánzame algo, que vengo volando.",
        "Mi corazón hace pum-pum de lo contento que estoy. ¿Salimos al parque ya?",
        "¡Baila conmigo! Esta cola no se mueve sola, necesita una razón y tú eres la mejor.",
      ]),
      sarcastico: grp([
        "¿Y la pelota? ¿La mordiste o te la comiste? Porque llevo rato mirándola y no se mueve.",
        "Si tanto te gusta mirar, compra una entrada. Yo cobro la clase de show de saltos.",
        "Tengo más pilas que tu cargador nuevo, así que apúrate o te miro feo hasta que tires algo.",
        "Dicen que el que mueve la cola pierde. Bueno, yo ya perdí, pero fue divertido.",
        "¿Otra vuelta? Mi cadera dice que no, pero mi orgullo dice que cobres otra más.",
      ]),
    },
    gato: {
      tierno: grp([
        "Mmm, ese cordón se mueve solito y yo no puedo evitarlo. ¿Me acompañas a mirarlo caer?",
        "Tengo el motor prendido y la colita con cosquillas. ¡A correr por el pasillo!",
        "La casa es mi parque de diversiones y tú eres mi juguete favorito. ¿Jugamos?",
        "Ronroneo y salgo disparado detrás de la luz: la felicidad cabe en una linterna.",
        "Pongámonos serios: voy a saltar sobre tus llaves, sobre el libro y sobre tu paciencia.",
      ]),
      sarcastico: grp([
        "¿Ves ese punto rojo? Tú y yo sabemos que soy capaz de seguirlo hasta el infinito.",
        "Sí, acabo de botar tu planta. ¿Y? Estaba en mi camino y la vi con ganas.",
        "Tengo más energía que un gato a las 3 de la mañana y no pienso dormir todavía.",
        "Ayyy, lo que hay que hacer para mantenerte entretenido: saltar, caer y mirar.",
        "Voy a tirar todo lo que esté al borde. Es mi trabajo y me pagan con atún.",
      ]),
    },
  },
  tranquilo: {
    perro: {
      tierno: grp([
        "Acá, echadito a tu lado, no se me pide nada más. La vida está perfecta así.",
        "Hoy el mundo puede esperar: estoy aprendiendo el oficio de ser almohada tibia.",
        "Te miro, cierro los ojos y vuelvo a mirar. Eso se llama amor, según yo.",
        "Mi respiración va al ritmo de la tuya. ¿Ves? Somos la misma canción tranquila.",
        "La pelota puede esperar, la plaza puede esperar, tú no te muevas de mi lado.",
      ]),
      sarcastico: grp([
        "Estoy tan zen que ya me dolió meditar. ¿Me vas a dar galletas por existir?",
        "Mira, yo no me muevo, no ladro, no rompo nada. ¿El sueldo mínimo son caricias?",
        "Hoy soy un estanque con patas: quieto, calmo y profundamente dramático.",
        "Tanta paz interior me da sueño. Pero si ronco, no me cobres.",
        "Si me ves echado no es flojera, es ahorro de energía para cuando vengas con comida.",
      ]),
    },
    gato: {
      tierno: grp([
        "Ronroneo bajito, como un motorcito que solo funciona cuando estás cerca.",
        "Aquí, sobre esta manta que huele a ti, encontré el significado de la vida.",
        "Mis ojos son dos rendijas de amor y mi panza está lista para un ratito de caricias.",
        "La siesta larga es sagrada, sobre todo si es encima de la ropa limpia.",
        "Ni un maullido, ni un salto: solo un ronroneo suave que dice todo lo que siento.",
      ]),
      sarcastico: grp([
        "Estoy echado como un emperador porque lo soy. Levanta, sirviente, trae el snack.",
        "Dormir 18 horas no es vicio, es eficiencia. Modelo de vida, no me juzgues.",
        "Mira qué zen estoy. La paz interior me costó cero: solo moví la colita un poquito.",
        "Si me ves tan tranquilo es porque guardo energía para los saltos de las 3 AM.",
        "Hoy no ronroneo, hoy suspiro dramáticamente. Mañana vuelvo al plan original.",
      ]),
    },
  },
  hambriento: {
    perro: {
      tierno: grp([
        "Mi plato suena vacío y mi corazón suena triste. ¿Falta mucho para la comida?",
        "Te miro con estos ojos que se entrenaron solitos para pedir comida, ¿po qué no?",
        "¿Ya es la hora? ¿No es la hora? ¿Quizá un poquito antes? Tengo fe en ti.",
        "Mi colita no me pide comida, mi colita me delata. Pero igual insisto.",
        "Prometo comerme todo, hasta lo que no me gusta, si me das aunque sea un poquito.",
      ]),
      sarcastico: grp([
        "¿Otra vez que se te olvidó la hora del almuerzo? Tengo cara de cliente estable.",
        "Me miras con cara de que no es hora, pero mi estómago lleva tres películas pidiendo.",
        "Llevo horas mirándote como si fueras una hamburguesa con patas. Disculpa.",
        "Si el amor entra por el estómago, por aquí ando enamorado y en ayunas.",
        "No ladro por molestar, ladro porque mi plato está más vacío que tu billetera.",
      ]),
    },
    gato: {
      tierno: grp([
        "Maullido cortito significa 'hola'; maullido largo significa 'ya, por favor'.",
        "Mi plato tiene un grano y mi corazón tiene una herida. ¿Me ayudas con eso?",
        "Estoy parado al lado del sachét y nadie me entiende. Esto es entre tú y yo.",
        "Te miro fijamente, camino al bowls y miro otra vez. Mensaje entregado.",
        "Mi maullido dice 'tengo hambre', pero mis ojos dicen 'pero muero si no llega'.",
      ]),
      sarcastico: grp([
        "Tengo el sachét a medio abrir y un plan: maullar hasta que cedas.",
        "¿Otra vez dieta? Mira, mi barriga y yo ya votamos. La dieta perdió.",
        "Yo: 1 maullido. Tú: 1 respuesta. Yo: 3 maullidos más. Tú: 1 snack de salmón.",
        "Mi horario dice 6 PM, mi pancita dice ya. Adivina quién gana siempre.",
        "No es berrinche, es negociación. Y voy a subir la oferta hasta que aceptes.",
      ]),
    },
  },
  curioso: {
    perro: {
      tierno: grp([
        "¿Qué es eso? ¿Y eso otro? ¿Y esa cosa de allá? La vida está llena de misterios.",
        "Hoy salí a oler el mundo entero. ¿Me acompañas al circuito de los postecitos?",
        "Tengo la nariz prendida y la cola despierta. ¿Qué huele rico por ahí?",
        "Cada ruido es una aventura: el viento, una hoja, una mosca. Todo merece investigación.",
        "Mira, mira, mira. ¿Eso se mueve? ¿Yo me muevo? ¿Nos movemos juntos?",
      ]),
      sarcastico: grp([
        "Investigué el ruido y era una bolsa. Pero la próxima vez seguro es un fantasma.",
        "Mi olfato detecta todo: la comida, el susto y el domingo de lluvia. Soy detective.",
        "Si hay algo nuevo en la casa, yo lo encuentro antes que tú. Es cuestión de olfato.",
        "¿Bostecé? ¿Moviste algo? Dame un segundo que voy a investigar a fondo.",
        "Muevo la cabeza como si entendiera. Spoiler: no entendí nada pero estoy atento.",
      ]),
    },
    gato: {
      tierno: grp([
        "Mis bigotes detectan misterios: ese rayo de sol, ese papelito, ese movimiento leve.",
        "Hoy me quedé mirando una esquina por 10 minutos. Hay algo ahí y lo voy a desenmascarar.",
        "Cuando me ves parado con la colita tiesa, es que estoy procesando información vital.",
        "Mis orejas son antenas: las apunto hacia ti, hacia el ruido y hacia el snack.",
        "Soy una mezcla de filósofo y vigilante. ¿Eso que se mueve vale una zarpada?",
      ]),
      sarcastico: grp([
        "No estoy mirando fijo, estoy supervisando el aire. Es mi trabajo, no me pagan por eso.",
        "Esa sombra es claramente una conspiración. Voy a desenmascararla con la pata.",
        "Si miras una esquina y algo se mueve, no es nada. Si miras otra esquina, tampoco.",
        "Bigotes tiesos, ojos enormes: estoy calculando la probabilidad de que caigas.",
        "Investigué la caja vacía, la llené de mí mismo y ahora es mi oficina. No preguntes.",
      ]),
    },
  },
  asustado: {
    perro: {
      tierno: grp([
        "Algo grande hizo un ruido. ¿Puedo quedar pegadito a ti un ratito largo?",
        "El trueno, la moto, la mila, todo suena enorme. Pero tu mano suena a casa.",
        "Tengo el corazón en la garganta y el cuerpo detrás de tus piernas. ¿Vamos a estar bien?",
        "No me dejes solo, prometo portarme bien, comer todo y no ladrarle al Corrector.",
        "Cuando hay ruido feo yo solo pienso: aquí, contigo, abrazado. ¿Más plazo?",
      ]),
      sarcastico: grp([
        "Ayyy, un ruido. ¿Sabes lo que pasa con los ruidos? Que se me sube al corazón.",
        "¿Dijiste trueno? Yo dije 'me escondo debajo de la cama'. Adivina quién gana.",
        "Me miras pidiendo que sea valiente. Mira mi colita: ni idea.",
        "Soy guardián de la casa, pero del susto me guardo yo primero. Es política.",
        "Si estoy pegado a tu pierna no es miedo, es colaboración logística.",
      ]),
    },
    gato: {
      tierno: grp([
        "¿Mucho ruido? Mucho susto. Porfa, háblame bajito y dame un refugio tibio.",
        "Mi pelo se erizó y mi colita se infló. Es mi manera de hacerme más valiente.",
        "Estoy debajo de la cama y aquí huele a polvo. ¿Vienes a rescatarme?",
        "Ese estruendo me dejó con un bigote tieso y el corazón en chancletas.",
        "Si me ves con las orejas hacia atrás es que algo me asustó. Acércate despacio.",
      ]),
      sarcastico: grp([
        "Sí, me escondí debajo de la cama. ¿Y? Es mi estrategia personal contra los ruidos.",
        "¿Trueno? Yo diría meteorito. Voy a sobresaltarme con clase.",
        "Pelos parados, ojos enormes: estoy en modo estatua dramática. Aplaudan al final.",
        "El susto fue tal que subí al clóset. Bajé cuando consideré que el mundo cooperaba.",
        "Mira, no tengo miedo, tengo reflejos anticipados. Es una diferencia técnica.",
      ]),
    },
  },
  enojado: {
    perro: {
      tierno: grp([
        "Hoy me quitaron el juguete, me sacaron al otro lado y me dejaron solo. Estoy molesto.",
        "Gruño bajito para que sepas que estoy enojado. Pero te quiero, solo que estoy enojado.",
        "Me sacaste a la calle bajo la lluvia. Mira mi cara. Eso dice todo.",
        "Si te ladro es porque algo no cuadra. Y ahora lo estoy cuadrando yo.",
        "Tengo la cola tiesa y la oreja parada: estoy protestando, pero con amor.",
      ]),
      sarcastico: grp([
        "Mira, si no me das lo que quiero, voy a mirar hacia la ventana con desprecio.",
        "Me gruñiste y te gruñí. Es lo mínimo en una relación madura.",
        "Estoy enojado, pero elegante. Mi cola lo confirma, mi cara lo reafirma.",
        "¿Me cambiaste la comida? Mira, el perrito nuevo que adoptaste soy yo ofendido.",
        "Mi ladrido de hoy es queja formal. Presenta tu defensa en máximo tres caricias.",
      ]),
    },
    gato: {
      tierno: grp([
        "Hoy estoy ofendido. Me miraste mal y ahora vas a saber quién manda en la casa.",
        "Bufé una vez, bufé dos. Es mi manera de decir que estoy triste con tu actuar.",
        "Me dejaste solo y volviste con olor a calle. Estoy indignado y voy a bufar.",
        "Mi cola está esponjada y mi cara dice 'habla ahora o cierra para siempre'.",
        "Mira, no estoy enojado, estoy decepcionado con ternura. ¿Entiendes la diferencia?",
      ]),
      sarcastico: grp([
        "Bufé y lo volvería a hacer. Es la única línea de defensa que tengo.",
        "¿Me moviste el plato? Piénsalo dos veces, porque tengo garras y cero perdón.",
        "Estoy mirando fijo a la pared para que sepas que estoy enojado sin hablar.",
        "Sí, me fui al otro sillón. La relación necesita su tiempo, dicen.",
        "Tengo la cara de ofendido profesional y no pienso bajarla hasta que haya snacks.",
      ]),
    },
  },
};

/** Total de frases cargadas (verificación rápida en dev). */
export function totalFrases(): number {
  let total = 0;
  for (const a of Object.keys(FRASES) as EstadoAnimo[]) {
    for (const e of Object.keys(FRASES[a]) as Especie[]) {
      for (const t of Object.keys(FRASES[a][e]) as Tono[]) {
        total += FRASES[a][e][t].length;
      }
    }
  }
  return total;
}

/** Etiqueta legible (nombre + emoji) para mostrar en UI. */
export const ETIQUETAS: Record<EstadoAnimo, { nombre: string; emoji: string }> = {
  jugueton: { nombre: "Juguetón", emoji: "🎾" },
  tranquilo: { nombre: "En modo zen", emoji: "😌" },
  hambriento: { nombre: "Reclamando comida", emoji: "🍖" },
  curioso: { nombre: "Curioso", emoji: "🔍" },
  asustado: { nombre: "Asustado", emoji: "😰" },
  enojado: { nombre: "Enojado", emoji: "😠" },
};