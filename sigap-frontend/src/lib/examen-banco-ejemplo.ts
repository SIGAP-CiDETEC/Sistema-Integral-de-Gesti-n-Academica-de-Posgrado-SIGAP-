import type { Nivel, Pregunta, TipoPregunta } from "./examen";
import type { AreaEvalId } from "./posgrado/datos";

/**
 * Banco de EJEMPLO para la demostración (preguntas escritas para probar el flujo; no son las del examen real).
 * Los bancos reales se importan desde Moodle en el navegador de Posgrado y nunca se suben al repositorio.
 */
type Base = { area: AreaEvalId; unidad: string; tema: string; nivel: Nivel; tipo: TipoPregunta; enunciado: string; retroalimentacion?: string };
let n = 0;
const q = (b: Base, extra: Partial<Pregunta>): Pregunta => ({
  id: `ej-${++n}`,
  activa: true,
  origen: "sigap",
  actualizadoEl: "2026-11-19T09:00:00",
  actualizadoPor: "Banco de ejemplo",
  ...b,
  ...extra,
});
const op = (correcta: string, ...otras: string[]) => [
  { id: "a", texto: correcta, correcta: true },
  ...otras.map((t, i) => ({ id: String.fromCharCode(98 + i), texto: t, correcta: false })),
];
const pares = (...xs: [string, string][]) => xs.map(([izquierda, derecha], i) => ({ id: `p${i + 1}`, izquierda, derecha }));

const M = (unidad: string, tema: string) => ({ area: "matematicas" as const, unidad, tema });
const P = (unidad: string, tema: string) => ({ area: "programacion" as const, unidad, tema });
const ANZ = "Aritmética de números enteros";
const PROB = "Probabilidad";
const AL = "Álgebra lineal";
const NR = "Números reales";

export const BANCO_EJEMPLO: Pregunta[] = [
  // ---------- Matemáticas ----------
  q({ ...M(ANZ, "1.1 Números primos"), nivel: "comprender", tipo: "opcion", enunciado: "<p>¿Cuál de los siguientes números es primo?</p>", retroalimentacion: "<p>97 solo es divisible entre 1 y 97.</p>" }, { opciones: op("97", "91", "87", "51") }),
  q({ ...M(ANZ, "1.1 Números primos"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>¿Cuál es la factorización en primos de \\(360\\)?</p>" }, { opciones: op("\\(2^3 \\cdot 3^2 \\cdot 5\\)", "\\(2^2 \\cdot 3^3 \\cdot 5\\)", "\\(2^3 \\cdot 3 \\cdot 15\\)", "\\(6^2 \\cdot 10\\)") }),
  q({ ...M(ANZ, "1.2 MCD y MCM"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>¿Cuánto vale \\(\\operatorname{mcd}(84, 126)\\)?</p>" }, { opciones: op("42", "21", "14", "252") }),
  q({ ...M(ANZ, "1.2 MCD y MCM"), nivel: "comprender", tipo: "vf", enunciado: "<p>Para cualesquiera enteros positivos \\(a\\) y \\(b\\) se cumple \\(\\operatorname{mcd}(a,b)\\cdot\\operatorname{mcm}(a,b)=a\\,b\\).</p>" }, { verdadero: true }),
  q({ ...M(ANZ, "1.3 Aritmética modular"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>¿Cuál es el residuo de \\(2^{10}\\) al dividirse entre 7?</p>", retroalimentacion: "<p>\\(2^3 \\equiv 1 \\pmod 7\\), así que \\(2^{10} = (2^3)^3\\cdot 2 \\equiv 2\\).</p>" }, { opciones: op("2", "1", "4", "3") }),
  q({ ...M(ANZ, "1.3 Aritmética modular"), nivel: "analizar", tipo: "opcion", enunciado: "<p>¿Cuál es el inverso multiplicativo de 3 módulo 11?</p>" }, { opciones: op("4", "3", "7", "No existe") }),
  q({ ...M(PROB, "2.1 Combinatoria"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>¿De cuántas formas se puede elegir un comité de 3 personas entre 8?</p>" }, { opciones: op("56", "336", "24", "512") }),
  q({ ...M(PROB, "2.1 Combinatoria"), nivel: "comprender", tipo: "relacionar", enunciado: "<p>Relaciona cada situación con la expresión que la cuenta.</p>" }, { pares: pares(["Ordenar 5 libros distintos en un estante", "5!"], ["Elegir 2 de 5 sin importar el orden", "C(5,2)"], ["Podio de 1.º, 2.º y 3.º entre 5", "P(5,3)"], ["Contraseñas de 5 dígitos", "10⁵"]) }),
  q({ ...M(PROB, "2.2 Probabilidad finita"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>Se lanzan dos dados justos. ¿Cuál es la probabilidad de que la suma sea 7?</p>" }, { opciones: op("\\(1/6\\)", "\\(1/12\\)", "\\(7/36\\)", "\\(1/36\\)") }),
  q({ ...M(PROB, "2.2 Probabilidad finita"), nivel: "analizar", tipo: "vf", enunciado: "<p>Si \\(A\\) y \\(B\\) son eventos independientes con probabilidad positiva, entonces son mutuamente excluyentes.</p>" }, { verdadero: false }),
  q({ ...M(AL, "3.1 Matrices"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>¿Cuál es el determinante de \\(\\begin{pmatrix} 2 & 1 \\\\ 4 & 3 \\end{pmatrix}\\)?</p>" }, { opciones: op("2", "10", "-2", "5") }),
  q({ ...M(AL, "3.1 Matrices"), nivel: "comprender", tipo: "vf", enunciado: "<p>El producto de matrices cuadradas es conmutativo: \\(AB = BA\\) para cualesquiera \\(A\\) y \\(B\\).</p>" }, { verdadero: false }),
  q({ ...M(AL, "3.2 Rango, nulidad, eigenvalores"), nivel: "comprender", tipo: "opcion", enunciado: "<p>Una matriz de \\(4 \\times 6\\) tiene rango 3. ¿Cuál es su nulidad?</p>" }, { opciones: op("3", "1", "2", "4") }),
  q({ ...M(AL, "3.2 Rango, nulidad, eigenvalores"), nivel: "analizar", tipo: "opcion", enunciado: "<p>¿Cuáles son los eigenvalores de \\(\\begin{pmatrix} 3 & 0 \\\\ 1 & 5 \\end{pmatrix}\\)?</p>" }, { opciones: op("3 y 5", "1 y 3", "0 y 8", "4 y 4") }),
  q({ ...M(AL, "3.3 Funciones de matrices"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>Si \\(A = \\operatorname{diag}(1, 2)\\), ¿cuánto vale \\(e^{A}\\)?</p>" }, { opciones: op("\\(\\operatorname{diag}(e, e^2)\\)", "\\(\\operatorname{diag}(1, 2)\\)", "\\(e\\,I\\)", "\\(\\operatorname{diag}(e, 2e)\\)") }),
  q({ ...M(AL, "3.3 Funciones de matrices"), nivel: "comprender", tipo: "vf", enunciado: "<p>Si \\(A\\) es diagonalizable, \\(A = PDP^{-1}\\), entonces \\(A^{k} = P D^{k} P^{-1}\\).</p>" }, { verdadero: true }),
  q({ ...M(NR, "4.1 Axiomas"), nivel: "recordar", tipo: "relacionar", enunciado: "<p>Relaciona cada propiedad de los números reales con su enunciado.</p>" }, { pares: pares(["Conmutatividad", "a + b = b + a"], ["Asociatividad", "(a + b) + c = a + (b + c)"], ["Elemento neutro", "a + 0 = a"], ["Distributividad", "a(b + c) = ab + ac"]) }),
  q({ ...M(NR, "4.1 Axiomas"), nivel: "comprender", tipo: "opcion", enunciado: "<p>¿Qué axioma garantiza que todo conjunto no vacío y acotado superiormente de reales tiene supremo?</p>" }, { opciones: op("Axioma del supremo (completitud)", "Axioma de tricotomía", "Propiedad arquimediana", "Axioma de inducción") }),
  q({ ...M(NR, "4.2 Sucesiones y series"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>¿Cuál es la suma de la serie \\(\\sum_{n=0}^{\\infty} \\left(\\tfrac{1}{3}\\right)^n\\)?</p>" }, { opciones: op("\\(3/2\\)", "\\(1/3\\)", "\\(3\\)", "Diverge") }),
  q({ ...M(NR, "4.2 Sucesiones y series"), nivel: "analizar", tipo: "vf", enunciado: "<p>La serie armónica \\(\\sum_{n=1}^{\\infty} \\frac{1}{n}\\) converge.</p>" }, { verdadero: false }),
  q({ ...M(NR, "4.3 Límites"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>¿Cuánto vale \\(\\displaystyle\\lim_{x \\to 0} \\frac{\\sin 3x}{x}\\)?</p>" }, { opciones: op("3", "1", "0", "No existe") }),
  q({ ...M(NR, "4.3 Límites"), nivel: "analizar", tipo: "opcion", enunciado: "<p>¿Cuánto vale \\(\\displaystyle\\lim_{n \\to \\infty} \\left(1 + \\frac{2}{n}\\right)^{n}\\)?</p>" }, { opciones: op("\\(e^2\\)", "\\(e\\)", "1", "\\(\\infty\\)") }),

  // ---------- Programación ----------
  q({ ...P("1 Fundamentos", "1.1 Ciclo de desarrollo"), nivel: "comprender", tipo: "relacionar", enunciado: "<p>Relaciona cada archivo con la etapa en que se genera.</p>" }, { pares: pares(["Código fuente", "Codificación"], ["Código objeto", "Compilación"], ["Ejecutable", "Enlazado"]) }),
  q({ ...P("1 Fundamentos", "1.1 Ciclo de desarrollo"), nivel: "recordar", tipo: "corta", enunciado: "<p>¿Cómo se llama el programa que traduce todo el código fuente a código máquina antes de ejecutarlo?</p>" }, { respuestas: ["compilador", "un compilador"] }),
  q({ ...P("1 Fundamentos", "1.2 Operadores y expresiones"), nivel: "aplicar", tipo: "opcion", enunciado: "<p>Con la jerarquía usual de operadores, ¿cuánto vale <code>10 - 2 * 3 + 8 / 4</code>?</p>" }, { opciones: op("6", "26", "8", "2") }),
  q({ ...P("1 Fundamentos", "1.2 Operadores y expresiones"), nivel: "comprender", tipo: "vf", enunciado: "<p>Si A es verdadero y B es falso, la expresión <code>A or B</code> es verdadera.</p>" }, { verdadero: true }),
  q({ ...P("2 Estructuras de control", "2.1 Condicionales"), nivel: "aplicar", tipo: "opcion", enunciado: "<pre>si (x &gt; 10) imprimir \"A\"\nsino si (x &gt; 5) imprimir \"B\"\nsino imprimir \"C\"</pre><p>¿Qué se imprime si <code>x = 10</code>?</p>" }, { opciones: op("B", "A", "C", "A y B") }),
  q({ ...P("2 Estructuras de control", "2.2 Ciclos"), nivel: "analizar", tipo: "opcion", enunciado: "<pre>i = 1; s = 0\nmientras i &lt;= 5 hacer\n   s = s + i\n   i = i + 2\nfin</pre><p>¿Cuánto vale <code>s</code> al terminar?</p>" }, { opciones: op("9", "15", "6", "5") }),
  q({ ...P("2 Estructuras de control", "2.2 Ciclos"), nivel: "comprender", tipo: "relacionar", enunciado: "<p>Relaciona cada ciclo con su característica.</p>" }, { pares: pares(["while", "Evalúa la condición antes de cada vuelta"], ["do-while", "Se ejecuta al menos una vez"], ["for", "Se usa cuando se conoce el número de vueltas"]) }),
  q({ ...P("3 Funciones", "3.1 Paso de parámetros"), nivel: "comprender", tipo: "vf", enunciado: "<p>Con paso por valor, los cambios al parámetro dentro de la función no modifican la variable original.</p>" }, { verdadero: true }),
  q({ ...P("3 Funciones", "3.1 Paso de parámetros"), nivel: "analizar", tipo: "opcion", enunciado: "<p>¿Qué se necesita para que una función intercambie los valores de dos variables del programa que la llama?</p>" }, { opciones: op("Recibirlas por referencia (o con apuntadores)", "Recibirlas por valor", "Declararlas como constantes", "Devolver un solo valor") }),
  q({ ...P("3 Funciones", "3.2 Recursividad"), nivel: "comprender", tipo: "opcion", enunciado: "<p>¿Qué evita que una función recursiva se llame indefinidamente?</p>" }, { opciones: op("Un caso base", "Un ciclo for", "Una variable global", "El paso por valor") }),
  q({ ...P("4 Apuntadores", "4.1 Conceptos"), nivel: "recordar", tipo: "opcion", enunciado: "<p>¿Qué almacena un apuntador?</p>" }, { opciones: op("Una dirección de memoria", "Un valor booleano", "Una función", "Un arreglo completo") }),
  q({ ...P("4 Apuntadores", "4.2 Aritmética de apuntadores"), nivel: "analizar", tipo: "opcion", enunciado: "<p>Si <code>p</code> apunta al primer elemento de un arreglo de enteros, ¿qué es <code>p + 1</code>?</p>" }, { opciones: op("La dirección del segundo elemento", "El valor del segundo elemento", "El primer valor más 1", "La dirección del byte siguiente") }),
];
