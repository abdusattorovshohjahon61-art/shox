// Kredit paketlari (bir martalik to'lov). Narxlar so'mda.
export interface Pack {
  id: string;
  name: string;
  credits: number;
  price: number;
  featured?: boolean;
}

export const PACKS: Pack[] = [
  { id: "start", name: "Start", credits: 200, price: 29_000 },
  { id: "pro", name: "Pro", credits: 1_000, price: 99_000, featured: true },
  { id: "studio", name: "Studio", credits: 4_000, price: 299_000 },
];

export const getPack = (id: string) => PACKS.find((p) => p.id === id);

export const formatSum = (n: number) => n.toLocaleString("ru-RU").replace(/,/g, " ");
