/** ID temporal con el que el aspirante entra a SIGAP: el folio MTCA2701 se muestra como MTC-A2701. */
export const idTemporal = (folio: string) => folio.replace(/^MTC([AB])(\d{4})$/, "MTC-$1$2");
