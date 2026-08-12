import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
config({ path: '.env.local' }); config({ path: '.env' });
const APPLY=process.argv.includes('--apply');
const SOT3='1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const creds=JSON.parse((process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim().startsWith('{')?process.env.GOOGLE_SERVICE_ACCOUNT_KEY:Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY,'base64').toString()));
const sheets=new sheets_v4.Sheets({auth:new GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
const c=v=>String(v??'').replace(/\s+/g,' ').trim();
const meta=await sheets.spreadsheets.get({spreadsheetId:SOT3});
const loteSheetId=meta.data.sheets.find(s=>s.properties.title==='Lotes').properties.sheetId;
const inv=(await sheets.spreadsheets.values.get({spreadsheetId:SOT3,range:`'Inventario'!A:AZ`})).data.values||[];
const H=inv[0].map(c); const LOTE=H.findIndex(h=>h.toLowerCase().includes('loteid'));
const items=inv.slice(1).filter(r=>/^B-001/i.test(c(r[LOTE]))).length;
const lotes=(await sheets.spreadsheets.values.get({spreadsheetId:SOT3,range:`'Lotes'!A:U`})).data.values||[];
const idx=lotes.findIndex(r=>/^B-001/i.test(c(r[0])));
if(idx<0){console.log('B-001 no existe');process.exit(0);}
console.log(`B-001 = "${c(lotes[idx][0])}" fila ${idx+1} · estado "${c(lotes[idx][13])}" · ítems: ${items} · modo ${APPLY?'APLICAR':'DRY-RUN'}`);
if(items>0){console.error('⛔ tiene ítems, abortado');process.exit(1);}
writeFileSync('scripts/.backup-borrar-b001.json',JSON.stringify({fecha:'2026-07-24',loteSheetId,fila:idx+1,valores:lotes[idx]},null,2));
if(!APPLY){console.log('Backup escrito. Dry-run.');process.exit(0);}
await sheets.spreadsheets.batchUpdate({spreadsheetId:SOT3,requestBody:{requests:[{deleteDimension:{range:{sheetId:loteSheetId,dimension:'ROWS',startIndex:idx,endIndex:idx+1}}}]}});
const after=(await sheets.spreadsheets.values.get({spreadsheetId:SOT3,range:`'Lotes'!A:A`})).data.values||[];
console.log(after.some(r=>/^B-001/i.test(c(r[0])))?'⚠️ aún presente':'✅ Verificado: B-001 borrado ✓');
