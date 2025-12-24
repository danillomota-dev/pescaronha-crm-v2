export interface CsvRow {
  Nome: string;
  Telefone: string;
  Status: string;
  'Produtos de interesse': string;
  'Data do último contato': string;
  'Data do próximo contato': string;
  'Previsão de Compra': string;
  'Tipo de FUP atual': string;
  'Observações (resumo, objeções)'?: string;
  'Observações'?: string;
  [key: string]: string | undefined;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  products: string;
  lastContact: string;
  nextContact: string;
  purchaseForecast: string;
  fupType: string;
  notes: string;
  daysSinceLastContact: number;
  daysUntilNextContact: number | null;
}

export enum LeadStatus {
  HOT = 'Quente',
  WARM = 'Morno',
  COLD = 'Frio',
  CLIENT = 'Cliente',
  LOST = 'Perdido'
}