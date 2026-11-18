export function translateHotelbedsRoomName(rawName: string): string {
  if (!rawName) return "Acomodação Selecionada";
  let name = rawName.trim();

  // Preservar qualificadores do fornecedor (camas, vista etc.) dentro de parênteses.
  name = name.replace(/\(\s*\)/g, " ").trim();

  const rules: [RegExp, string][] = [
    [/\bACCESSIBILITY\b/gi, "Adaptado"],
    [/\bWITH\s+BATH\b/gi, "com Banheira"],
    [/\bBATH\b/gi, "Banheira"],
    [/\bQuarto\s+Individual\s+Beds\b/gi, "Camas de Solteiro"],
    [/\bQuarto\s+Individual\s+Bed\b/gi, "Cama de Solteiro"],
    [/\b(?:SINGLE|TWIN)\s+BEDS\b/gi, "Camas de Solteiro"],
    [/\bSINGLE\s+BED\b/gi, "Cama de Solteiro"],
    [/\bDOUBLE\s+BEDS\b/gi, "Camas de Casal"],
    [/\bDOUBLE\s+BED\b/gi, "Cama de Casal"],
    [/\bDOUBLE\s+LUXURY\s+FRONT\s+OCEAN\b/gi, "Quarto Duplo Luxo Frente Mar"],
    [/\bLUXURY\s+DOUBLE\s+FRONT\s+OCEAN\b/gi, "Quarto Duplo Luxo Frente Mar"],
    [/\bDOUBLE\s+LUXURY\s+OCEAN\s+VIEW\b/gi, "Quarto Duplo Luxo Vista Mar"],
    [/\bDOUBLE\s+DELUXE\s+OCEAN\s+VIEW\b/gi, "Quarto Duplo Deluxe Vista Mar"],
    [/\bDOUBLE\s+DELUXE\s+SEA\s+VIEW\b/gi, "Quarto Duplo Deluxe Vista Mar"],
    [/\bSTANDARD\s+DOUBLE\b/gi, "Quarto Duplo Standard"],
    [/\bDOUBLE\s+STANDARD\b/gi, "Quarto Duplo Standard"],
    [/\bSUPERIOR\s+DOUBLE\b/gi, "Quarto Duplo Superior"],
    [/\bDOUBLE\s+SUPERIOR\b/gi, "Quarto Duplo Superior"],
    [/\bDOUBLE\s+LUXURY\b/gi, "Quarto Duplo Luxo"],
    [/\bLUXURY\s+DOUBLE\b/gi, "Quarto Duplo Luxo"],
    [/\bDOUBLE\s+DELUXE\b/gi, "Quarto Duplo Deluxe"],
    [/\bDELUXE\s+DOUBLE\b/gi, "Quarto Duplo Deluxe"],
    [/\bJUNIOR\s+SUITE\s+OCEAN\s+VIEW\b/gi, "Suíte Júnior Vista Mar"],
    [/\bJUNIOR\s+SUITE\b/gi, "Suíte Júnior"],
    [/\bMASTER\s+SUITE\s+OCEAN\s+VIEW\b/gi, "Suíte Master Vista Mar"],
    [/\bMASTER\s+SUITE\b/gi, "Suíte Master"],
    [/\bEXECUTIVE\s+SUITE\b/gi, "Suíte Executiva"],
    [/\bPRESIDENTIAL\s+SUITE\b/gi, "Suíte Presidencial"],
    [/\bTWIN\s+LUXURY\b/gi, "Quarto Twin Luxo"],
    [/\bLUXURY\s+TWIN\b/gi, "Quarto Twin Luxo"],
    [/\bTWIN\s+DELUXE\b/gi, "Quarto Twin Deluxe"],
    [/\bDELUXE\s+TWIN\b/gi, "Quarto Twin Deluxe"],
    [/\bTWIN\s+STANDARD\b/gi, "Quarto Twin Standard"],
    [/\bSTANDARD\s+TWIN\b/gi, "Quarto Twin Standard"],
    [/\bTRIPLE\s+DELUXE\b/gi, "Quarto Triplo Deluxe"],
    [/\bTRIPLE\s+STANDARD\b/gi, "Quarto Triplo Standard"],
    [/\bSINGLE\s+STANDARD\b/gi, "Quarto Individual Standard"],
    [/\bSINGLE\s+SUPERIOR\b/gi, "Quarto Individual Superior"],
    [/\bFRONT\s+OCEAN\b/gi, "Frente Mar"],
    [/\bOCEAN\s+VIEW\b/gi, "Vista Mar"],
    [/\bSEA\s+VIEW\b/gi, "Vista Mar"],
    [/\bCITY\s+VIEW\b/gi, "Vista Cidade"],
    [/\bGARDEN\s+VIEW\b/gi, "Vista Jardim"],
    [/\bMOUNTAIN\s+VIEW\b/gi, "Vista Montanha"],
    [/\bOCEAN\s+FRONT\b/gi, "Frente Mar"],
    [/\bOCEAN\b/gi, "Mar"],
    [/\bDOUBLE\b/gi, "Quarto Duplo"],
    [/\bTWIN\b/gi, "Quarto Twin"],
    [/\bSINGLE\b/gi, "Quarto Individual"],
    [/\bTRIPLE\b/gi, "Quarto Triplo"],
    [/\bSUITE\b/gi, "Suíte"],
    [/\bDELUXE\b/gi, "Deluxe"],
    [/\bSTANDARD\b/gi, "Standard"],
    [/\bSUPERIOR\b/gi, "Superior"],
    [/\bEXECUTIVE\b/gi, "Executivo"],
    [/\bLUXURY\b/gi, "Luxo"],
    [/\bWITH\s+BALCONY\b/gi, "com Varanda"],
    [/\bBALCONY\b/gi, "Varanda"],
    [/\bAPARTMENTS?\b/gi, "Apartamento"],
    [/\bWITH\b/gi, "com"],
    [/\bLuxo\s+Apartamento\b/gi, "Apartamento Luxo"],
  ];

  for (const [pattern, replacement] of rules) {
    name = name.replace(pattern, replacement);
  }

  return name.replace(/\bQuarto(?:\s+Quarto)+\b/gi, "Quarto").replace(/\s+/g, " ").trim();
}
