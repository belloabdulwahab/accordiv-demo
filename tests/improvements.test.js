import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoRepository } from '../src/services/demoRepository.js';
import { createDemoData } from '../src/data/createDemoData.js';
import { validStoredSettings, validateSettings } from '../src/services/settingsRules.js';
import { normalizeIdentity } from '../src/services/identityRules.js';
import { invoicePdfDefinition } from '../src/services/invoicePdf.js';
const today = '2026-10-09';
function setup(seed = () => createDemoData(today)) {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
  const repo = createDemoRepository(() => storage, seed, { today: () => today });
  return {repo,storage};
}
function legacySeed() {
  const data = createDemoData(today);
  data.clients[0].phone = '+234 historical client ext 2';
  data.settings.phone = '+234 historical issuer';
  for (const invoice of data.invoices) {
    if (invoice.billingSnapshot && invoice.clientId === data.clients[0].id) invoice.billingSnapshot.phone = data.clients[0].phone;
    if (invoice.issuerSnapshot) invoice.issuerSnapshot.phone = data.settings.phone;
  }
  return data;
}
const input = (changes = {}) => ({ contact: 'Separate contact', company: '', email: 'separate@example.com', phone: '08012345678', address: '', notes: '', ...changes });
const project = (clientId, changes = {}) => ({ name: 'Review title', clientId, status: 'planned', fee: '100.00', startDate: '', deadline: '', description: '', ...changes });

test('new phone writes enforce ASCII format and preserve zeroes without stripping letters', () => {
  const {repo} = setup();
  const before = repo.getSnapshot().data;
  for (const phone of ['abc08012345678','0801234567','080123456789','18012345678','080 12345678','+2348012345678','０８０１２３４５６７８','0١٢٣٤٥٦٧٨٩٠',12345678901,null]) {
    const result = repo.saveClient(input({phone}));
    assert.equal(result.ok,false); assert.ok(result.errors.phone);
    assert.deepEqual(repo.getSnapshot().data,before);
  }
  assert.equal(repo.saveClient(input()).record.phone,'08012345678');
  assert.equal(repo.saveClient(input({contact:'Blank phone', email:'blank@example.com',phone:''})).record.phone,'');
});

test('unchanged historical client/settings phones survive unrelated edits and refresh without rewriting PDFs', () => {
  const {repo,storage} = setup(legacySeed);
  const before = repo.getSnapshot().data;
  const client = before.clients[0], oldPhone = client.phone;
  assert.ok(oldPhone && !/^0[0-9]{10}$/.test(oldPhone));
  const originalPdf = invoicePdfDefinition(before, before.invoices.find(i=>i.status==='issued').id, today, new Date(`${today}T12:00:00.000Z`));
  assert.equal(repo.saveClient({...client,notes:'Unrelated note'},client.id).record.phone,oldPhone);
  const omitted = {...client,notes:'Another note'};delete omitted.phone;
  assert.equal(repo.saveClient(omitted,client.id).record.phone,oldPhone);
  assert.equal(repo.saveClient({...client,phone:'old letters changed'},client.id).ok,false);
  const settings = repo.getSnapshot().data.settings;
  assert.equal(repo.saveSettings({...settings,address:'New business address'}).record.phone,settings.phone);
  assert.ok(validStoredSettings(repo.getSnapshot().data.settings));
  assert.equal(repo.saveSettings({...settings,phone:'abc08012345678'}).ok,false);
  const refreshed = createDemoRepository(()=>storage,()=>{throw Error('Must not reseed');}).getSnapshot().data;
  assert.equal(refreshed.clients[0].phone,oldPhone);
  assert.deepEqual(refreshed.invoices,before.invoices);assert.deepEqual(refreshed.payments,before.payments);
  assert.deepEqual(invoicePdfDefinition(refreshed,before.invoices.find(i=>i.status==='issued').id,today,new Date(`${today}T12:00:00.000Z`)).content,originalPdf.content);
  assert.equal(repo.saveClient({...client,phone:'09012345678'},client.id).record.phone,'09012345678');
});

test('settings use the same new-phone policy and retain bounded legacy values only as unchanged context', () => {
  const settings = legacySeed().settings;
  assert.ok(validateSettings(settings).errors.phone);
  assert.deepEqual(validateSettings(settings,settings).errors,{});
  for(const phone of ['0801234567','abc08012345678','18012345678',11,null]) assert.ok(validateSettings({...settings,phone},settings).errors.phone);
  assert.equal(validateSettings({...settings,phone:'09012345678'},settings).value.phone,'09012345678');
  assert.deepEqual(validateSettings({...settings,phone:''},settings).errors,{});
  assert.equal(validStoredSettings({...settings,phone:'x'.repeat(51)}),false);
});

test('normalized duplicate contacts include blank companies and archives and require explicit confirmation', () => {
  const {repo} = setup();
  const first = repo.saveClient(input({contact:'Élodie  Okeke'})).record;
  repo.setClientArchived(first.id,true);
  const second = input({contact:'  ÉLODIE\tOKEKE ',company:' ',email:'second@example.com'});
  const before = repo.getSnapshot().data;
  const review = repo.saveClient(second);
  assert.equal(review.code,'duplicate_review');assert.equal(review.review.matches.length,1);
  assert.equal(review.review.matches[0].id,first.id);assert.equal(review.review.matches[0].archived,true);
  assert.equal(review.review.matches[0].phone,'08012345678');
  assert.equal(repo.saveClient(second,undefined,true).ok,false);
  assert.deepEqual(repo.getSnapshot().data,before);
  const confirmed = repo.saveClient(second,undefined,review.review.token);
  assert.equal(confirmed.ok,true);assert.notEqual(confirmed.record.id,first.id);
  assert.equal(repo.saveClient({...second,email:first.email.toUpperCase()},undefined,review.review.token).errors.email.includes('already exists'),true);
});

test('company normalization, self exclusion and relevant identity edits preserve separate people', () => {
  const {repo} = setup();
  const a=repo.saveClient(input({contact:'Taylor Okeke',company:'Daylight   Studio'})).record;
  const b=repo.saveClient(input({contact:'Different person',company:'daylight studio',email:'different@example.com'})).record;
  assert.equal(repo.saveClient({...a,contact:' TAYLOR  OKEKE ',company:'daylight studio',notes:'Edit self'},a.id).ok,true);
  const edit={...b,contact:'Taylor Okeke',company:' Daylight Studio '};
  const review=repo.saveClient(edit,b.id);
  assert.equal(review.code,'duplicate_review');assert.deepEqual(review.review.matches.map(m=>m.id),[a.id]);
  assert.equal(repo.saveClient(edit,b.id,review.review.token).ok,true);
  assert.equal(repo.saveClient({...edit,notes:'Unrelated edit'},b.id).ok,true);
  assert.equal(normalizeIdentity('  NAME\u00a0  COMPANY  '),'name company');
  assert.equal(normalizeIdentity('\u0085NAME\u0085COMPANY\u0085'),'name company');
  assert.equal(normalizeIdentity('\uFEFFNAME\uFEFFCOMPANY\uFEFF'),'name company');
  assert.equal(normalizeIdentity('ΟΣ Σ'),'οσ σ');
});

test('stale duplicate confirmation cannot bypass changed match details or newly added matches', () => {
  const {repo} = setup();const a=repo.saveClient(input()).record;
  const second=input({email:'second@example.com'}), old=repo.saveClient(second);
  repo.setClientArchived(a.id,true);
  const stale=repo.saveClient(second,undefined,old.review.token);
  assert.equal(stale.code,'duplicate_review');assert.notEqual(stale.review.token,old.review.token);
  assert.equal(repo.saveClient(second,undefined,stale.review.token).ok,true);
  const third=input({email:'third@example.com'});
  assert.equal(repo.saveClient(third,undefined,stale.review.token).review.matches.length,2);
});

test('project review scopes normalized titles to clients and includes archived completed cancelled history', () => {
  const {repo}=setup();const client=repo.saveClient(input()).record;
  const first=repo.saveProject(project(client.id,{name:'Annual   Review',status:'completed',startDate:'2026-01-01'})).record;
  repo.setProjectArchived(first.id,true);
  const next=project(client.id,{name:' annual REVIEW ',status:'cancelled',deadline:'2026-03-01'});
  const review=repo.saveProject(next);
  assert.equal(review.code,'duplicate_review');assert.equal(review.review.matches[0].status,'completed');
  assert.equal(review.review.matches[0].startDate,'2026-01-01');assert.equal(review.review.matches[0].archived,true);
  const second=repo.saveProject(next,undefined,review.review.token).record;
  assert.equal(repo.saveProject({...next,description:'Self edit'},second.id).ok,true);
  assert.equal(repo.saveProject(next).review.matches.length,2);
  const other=repo.saveClient(input({contact:'Other contact',email:'other@example.com'})).record;
  assert.equal(repo.saveProject(project(other.id,{name:'Annual Review'})).ok,true);
  const distinct=repo.saveProject(project(client.id,{name:'Distinguishing title'})).record;
  const edited=repo.saveProject({...project(client.id),name:'Annual Review'},distinct.id);
  assert.equal(edited.review.matches.some(m=>m.id===distinct.id),false);
  assert.equal(repo.saveProject({...project(client.id),name:'Annual Review',fee:'bad'},distinct.id,edited.review.token).ok,false);
});
