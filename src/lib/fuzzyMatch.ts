// Shared fuzzy matching utilities for product search

export const normalize = (str: string) =>
  (str || "")
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, ' ') // remove punctuation/symbols
    .replace(/\s+/g, ' ')
    .trim();

export const synonyms: Record<string, string[]> = {
  platano: ['platano', 'plátano', 'cambur', 'banana'],
  manzana: ['manzana', 'manzanas'],
  tomate: ['tomate', 'tomates'],
  cebolla: ['cebolla', 'cebollas'],
  ajo: ['ajo', 'ajos'],
  papa: ['papa', 'papas', 'patata', 'patatas'],
  zanahoria: ['zanahoria', 'zanahorias'],
};

export const expandTerms = (term: string): string[] => {
  const t = normalize(term);
  const syns = synonyms[t];
  return syns ? Array.from(new Set(syns.map(normalize))) : [t];
};

export const fuzzyMatch = (searchTerm: string, productName: string): boolean => {
  const normProduct = normalize(productName);
  const candidateTerms = expandTerms(searchTerm);

  for (const normSearch of candidateTerms) {
    if (!normSearch) continue;
    // Direct substring match
    if (normProduct.includes(normSearch) || normSearch.includes(normProduct)) return true;

    // Split and check each word
    const searchWords = normSearch.split(' ').filter(w => w.length >= 2);
    const productWords = normProduct.split(' ').filter(w => w.length >= 2);

    if (searchWords.length > 0) {
      const matchCount = searchWords.filter(sw =>
        productWords.some(pw => pw.includes(sw) || sw.includes(pw))
      ).length;
      if (matchCount > 0 && (searchWords.length === 1 || matchCount >= Math.ceil(searchWords.length / 2))) {
        return true;
      }
    }
  }
  return false;
};
