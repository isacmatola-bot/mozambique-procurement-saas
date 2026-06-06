import { config } from '../config.js';

export type ContractExtraction = {
  vendor_name: string | null;
  vendor_nif: string | null;
  contract_value: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  termination_clause: string | null;
  obligations: string[];
  risks: string[];
  compliance_notes: string[];
};

function parseAmount(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function demoExtract(text: string): ContractExtraction {
  const valueMatch =
    text.match(/(?:valor|value|amount|preço|preco)[:\s-]*(?:MZN|MT|meticais)?\s*([0-9][0-9\s.,]{1,})/i) ??
    text.match(/(?:MZN|MT|meticais)\s*([0-9][0-9\s.,]{1,})/i);
  const nifMatch = text.match(/NIF[:\s-]*([0-9]{8,12})/i);
  const vendorMatch = text.match(/(?:fornecedor|supplier|contratada)[:\s-]*([^\n.,;]+)/i);
  const amount = valueMatch ? parseAmount(valueMatch[1]) : null;
  return {
    vendor_name: vendorMatch?.[1]?.trim() || null,
    vendor_nif: nifMatch?.[1] || null,
    contract_value: Number.isFinite(amount) ? amount : null,
    currency: /USD|dólar/i.test(text) ? 'USD' : 'MZN',
    start_date: null,
    end_date: null,
    payment_terms: /30 dias/i.test(text) ? 'Pagamento em 30 dias' : null,
    termination_clause: /rescis/i.test(text) ? 'Cláusula de rescisão detectada' : null,
    obligations: ['Rever objecto, prazo, preço e obrigações específicas no documento original.'],
    risks: amount && amount >= config.beneficialOwnershipThreshold ? ['Valor acima do limiar interno de beneficiário efectivo; confirmar divulgação.'] : [],
    compliance_notes: ['Extração em modo demo porque OPENAI_API_KEY não está configurada.']
  };
}

export async function extractContract(documentText: string): Promise<{ extraction: ContractExtraction; model: string; provider: string }> {
  if (!config.openAiApiKey) {
    return { extraction: demoExtract(documentText), model: 'demo-extractor', provider: 'local' };
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      vendor_name: { type: ['string', 'null'] },
      vendor_nif: { type: ['string', 'null'] },
      contract_value: { type: ['number', 'null'] },
      currency: { type: ['string', 'null'] },
      start_date: { type: ['string', 'null'], description: 'ISO date if available' },
      end_date: { type: ['string', 'null'], description: 'ISO date if available' },
      payment_terms: { type: ['string', 'null'] },
      termination_clause: { type: ['string', 'null'] },
      obligations: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
      compliance_notes: { type: 'array', items: { type: 'string' } }
    },
    required: ['vendor_name','vendor_nif','contract_value','currency','start_date','end_date','payment_terms','termination_clause','obligations','risks','compliance_notes']
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.openAiModel,
      input: [
        {
          role: 'system',
          content: 'You extract structured procurement contract data for Mozambique SME/institution procurement workflows. Return only valid JSON matching the schema.'
        },
        {
          role: 'user',
          content: documentText.slice(0, 40000)
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'contract_extraction',
          schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI extraction failed: ${response.status} ${errorText}`);
  }

  const json: any = await response.json();
  const outputText = json.output_text ?? json.output?.flatMap((o: any) => o.content ?? []).find((c: any) => c.type === 'output_text')?.text;
  if (!outputText) throw new Error('OpenAI response did not include output_text');

  return { extraction: JSON.parse(outputText), model: config.openAiModel, provider: 'openai' };
}
