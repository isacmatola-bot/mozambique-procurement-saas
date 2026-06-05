import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { one, pool, query } from '../db.js';

const passwordHash = await bcrypt.hash('admin123', config.bcryptRounds);
const userHash = await bcrypt.hash('user123', config.bcryptRounds);

const org = await one<any>(
  `insert into organizations (name,nif,address,phone,email)
   values ($1,$2,$3,$4,$5)
   on conflict do nothing
   returning *`,
  ['Instituto de Formação de Professores de Inhamizua', '400000000', 'Inhamizua, Beira, Sofala, Moçambique', '+258 23 000 000', 'admin@ifpinhamizua.ac.mz']
);

const existingOrg = org ?? await one<any>('select * from organizations limit 1');

await query(
  `insert into users (organization_id,name,email,password_hash,role)
   values
   ($1,'Administrador do Sistema','admin@procurement.mz',$2,'admin'),
   ($1,'Oficial de Procurement','procurement@institute.mz',$3,'procurement_officer'),
   ($1,'Oficial Financeiro','finance@institute.mz',$3,'finance_officer')
   on conflict (email) do nothing`,
  [existingOrg.id, passwordHash, userHash]
);

const admin = await one<any>('select * from users where email=$1', ['admin@procurement.mz']);

await query(
  `insert into suppliers (organization_id,name,nif,registration_number,address,contact_person,email,phone,category,local_supplier,beneficial_ownership_disclosed,status,risk_score,notes)
   values
   ($1,'Beira Office Supplies Lda','401234567','REG-2024-001','Beira, Sofala','Ana Mucavele','vendas@beiraoffice.co.mz','+258 84 111 2222','goods',true,true,'active',12,'Fornecedor local de material de escritório'),
   ($1,'Maputo Tech Services SA','402345678','REG-2024-002','Maputo','Carlos Nhaca','comercial@maputotech.co.mz','+258 82 333 4444','services',true,true,'active',18,'Serviços de TI e manutenção'),
   ($1,'EduBuild Contractors','403456789','REG-2024-003','Nampula','Marta Ali','info@edubuild.co.mz','+258 86 555 6666','works',true,false,'active',35,'Pequenas obras e reabilitação')
   on conflict do nothing`,
  [existingOrg.id]
);

const supplier = await one<any>('select id from suppliers where organization_id=$1 order by created_at asc limit 1', [existingOrg.id]);

await query(
  `insert into tenders (organization_id,title,reference_number,procurement_method,category,description,budget,currency,deadline,status,evaluation_criteria,created_by)
   values ($1,$2,$3,$4,$5,$6,$7,'MZN',current_date + interval '30 days',$8,$9,$10)
   on conflict (reference_number) do nothing`,
  [existingOrg.id, 'Aquisição de material didático e administrativo', 'IFPI/PROC/2026/001', 'quotation', 'goods', 'Compra de papel, toners, cadernos, pastas e material administrativo para o instituto.', 850000, 'published', JSON.stringify([{ name: 'Preço', weight: 40 }, { name: 'Qualidade', weight: 35 }, { name: 'Prazo de entrega', weight: 25 }]), admin.id]
);

const tender = await one<any>('select id from tenders where reference_number=$1', ['IFPI/PROC/2026/001']);

if (supplier && tender) {
  await query(
    `insert into bids (tender_id,supplier_id,amount,currency,technical_score,financial_score,local_preference_applied,total_score,status,notes)
     values ($1,$2,790000,'MZN',86,92,true,93.4,'qualified','Proposta inicial de demonstração')
     on conflict (tender_id, supplier_id) do nothing`,
    [tender.id, supplier.id]
  );
}

await pool.end();
console.log('Database seed completed. Login: admin@procurement.mz / admin123');
