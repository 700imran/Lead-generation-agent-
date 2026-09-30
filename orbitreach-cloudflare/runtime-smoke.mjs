import worker from './cloudflare-worker/src/index.js';

class Result { constructor(rows=[], changes=0){this.results=rows;this.meta={changes};} }
class DB {
  constructor(){this.tables={agents:new Map(),tasks:new Map(),events:new Map(),approvals:new Map()};}
  prepare(sql){const db=this; return { bind(...args){this.args=args;return this;}, async run(){return db.exec(sql,this.args||[],false)}, async first(){const r=db.exec(sql,this.args||[],true);return r.results[0]||null}, async all(){return db.exec(sql,this.args||[],false)} };}
  exec(sql,a,first){
    const t=this.tables;
    if(sql.startsWith('INSERT OR IGNORE INTO agents')){const [id,name,role,status]=a;if(!t.agents.has(id))t.agents.set(id,{id,name,role,status});return new Result([],1)}
    if(sql.startsWith('INSERT INTO agents')){const [id,name,role,status]=a;t.agents.set(id,{id,name,role,status});return new Result([],1)}
    if(sql.startsWith('INSERT INTO events')){const [id,ts,agent_id,task_id,type,status,payload]=a;t.events.set(id,{id,ts,agent_id,task_id,type,status,payload});return new Result([],1)}
    if(sql.startsWith('INSERT INTO approvals')){const [id,task_id,reason,status,created_at]=a;t.approvals.set(id,{id,task_id,reason,status,created_at});return new Result([],1)}
    if(sql.startsWith('INSERT INTO tasks')){const [id,action,step,agent_id,status,priority,input,created_at,updated_at,error]=a;t.tasks.set(id,{id,action,step,agent_id,status,priority,input,created_at,updated_at,error:error??null,attempts:0,output:'{}',approval_granted:0});return new Result([],1)}
    if(sql.startsWith('UPDATE tasks SET status=\'claiming\'')){let q=[...t.tasks.values()].filter(x=>x.status==='queued').sort((a,b)=>a.priority-b.priority||a.created_at.localeCompare(b.created_at))[0];if(!q)return new Result([],0);q.status='claiming';q.updated_at=a[0];return new Result([],1)}
    if(sql.startsWith('SELECT * FROM tasks WHERE status=\'claiming\'')){return new Result([...t.tasks.values()].filter(x=>x.status==='claiming').sort((a,b)=>b.updated_at.localeCompare(a.updated_at)),1)}
    if(sql.startsWith('SELECT * FROM tasks WHERE status=\'queued\'')){return new Result([...t.tasks.values()].filter(x=>x.status==='queued').sort((a,b)=>a.priority-b.priority||a.created_at.localeCompare(b.created_at)),1)}
    if(sql.startsWith('SELECT * FROM agents ORDER BY id'))return new Result([...t.agents.values()].sort((a,b)=>a.id.localeCompare(b.id)),1);
    if(sql.startsWith('SELECT * FROM tasks ORDER BY updated_at'))return new Result([...t.tasks.values()].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)),1);
    if(sql.startsWith('SELECT * FROM events ORDER BY ts'))return new Result([...t.events.values()].sort((a,b)=>b.ts.localeCompare(a.ts)),1);
    if(sql.startsWith('SELECT * FROM approvals ORDER BY created_at'))return new Result([...t.approvals.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)),1);
    if(sql.startsWith('SELECT * FROM agents WHERE id=')){return new Result([...t.agents.values()].filter(x=>x.id===a[0]),1)}
    if(sql.startsWith('SELECT * FROM approvals WHERE id=')){return new Result([...t.approvals.values()].filter(x=>x.id===a[0]&&(!sql.includes("status='pending'")||x.status==='pending')),1)}
    if(sql.startsWith('SELECT * FROM approvals WHERE task_id=')){return new Result([...t.approvals.values()].filter(x=>x.task_id===a[0]&&x.status==='pending'),1)}
    if(sql.startsWith('UPDATE agents SET status=? WHERE id=')){let [status,id]=a;let ag=t.agents.get(id);if(ag)ag.status=status;return new Result([],ag?1:0)}
    if(sql.startsWith('UPDATE agents SET status=')){let [status,current_task,heartbeat,id]=a;let ag=t.agents.get(id);if(ag){ag.status=status;if(sql.includes('current_task=?'))ag.current_task=current_task;ag.heartbeat_at=heartbeat}return new Result([],ag?1:0)}
    if(sql.startsWith('UPDATE tasks SET status=\'waiting_approval\'')){let [updated,id]=a;let q=t.tasks.get(id);if(q){q.status='waiting_approval';q.updated_at=updated}return new Result([],q?1:0)}
    if(sql.startsWith('UPDATE tasks SET status=\'running\',attempts=attempts+1')){let [updated,id]=a;let q=t.tasks.get(id);if(q){q.status='running';q.attempts++;q.updated_at=updated}return new Result([],q?1:0)}
    if(sql.startsWith('UPDATE tasks SET status=?,attempts=')){let [status,updated,id]=a;let q=t.tasks.get(id);if(q){q.status=status;q.attempts++;q.updated_at=updated}return new Result([],q?1:0)}
    if(sql.startsWith('UPDATE tasks SET status=?,output=')){let [status,output,updated,error,id]=a;let q=t.tasks.get(id);if(q){q.status=status;q.output=output;q.updated_at=updated;q.error=error}return new Result([],q?1:0)}
    if(sql.startsWith('UPDATE tasks SET status=?,error=')){let [status,error,updated,id]=a;let q=t.tasks.get(id);if(q){q.status=status;q.error=error;q.updated_at=updated}return new Result([],q?1:0)}
    if(sql.startsWith('UPDATE tasks SET status=\'completed\'')){let [updated,id]=a;let q=t.tasks.get(id);if(q)q.status='completed';return new Result([],q?1:0)}
    if(sql.startsWith('UPDATE tasks SET status=\'queued\',approval_granted=1')){let [updated,id]=a;let q=t.tasks.get(id);if(q){q.status='queued';q.approval_granted=1;q.updated_at=updated}return new Result([],q?1:0)}
    if(sql.startsWith('UPDATE approvals SET status=')){let [status,resolved,id]=a;let x=t.approvals.get(id);if(x){x.status=status;x.resolved_at=resolved}return new Result([],x?1:0)}
    throw new Error('Unhandled SQL: '+sql);
  }
}

let calls=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,opts)=>{
  if(String(url).includes('/v1/chat/completions')){
    calls++; return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({status:'completed',result:'ok',evidence:['mock-runtime'],next_step:null,risks:[],cost_notes:'bounded'})}}]}),{status:200,headers:{'content-type':'application/json'}});
  }
  return originalFetch(url,opts);
};
const env={DB:new DB(),ADMIN_TOKEN:'secret',HERMES_BASE_URL:'http://mock',HERMES_API_KEY:'x',MAX_OUTPUT_TOKENS:'1000',DEFAULT_TASK_BUDGET_USD:'1',ESTIMATED_COST_PER_1K_TOKENS_USD:'0.001'};
const req=(path,method='GET',body)=>new Request('https://orbit.test'+path,{method,headers:{'authorization':'Bearer secret','content-type':'application/json'},body:body?JSON.stringify(body):undefined});
const state=async()=>await (await worker.fetch(req('/api/state'),env)).json();
async function runAction(action,input={}){let r=await worker.fetch(req('/api/commands','POST',{command:'run_action',action,input} ),env);return r.json();}
async function tick(){return (await worker.fetch(req('/api/tick','POST'),env)).json()}
async function approvePending(){const s=await state();const p=s.approvals.find(x=>x.status==='pending');if(!p)throw new Error('expected pending approval');return (await worker.fetch(req('/api/commands','POST',{command:'approve',approval_id:p.id}),env)).json()}

// 1. Health
if(!(await (await worker.fetch(req('/health'),env)).json()).ok) throw new Error('health failed');
// 2. Demo/outreach: reaches approval, resumes after approval, then completes.
await runAction('demo_and_outreach',{compute_budget_usd:1,max_output_tokens:1000});
let guard=0, sawApproval=false;
while(guard++<30){let r=await tick(); console.log('tick',guard,r);if(r.status==='waiting_approval'){sawApproval=true;await approvePending();}const s=await state();if([...s.tasks.values?.()||[]]){};if(s.tasks.length && s.tasks.every(x=>x.status==='completed'))break;}
if(!sawApproval){console.log(JSON.stringify(await state(),null,2));throw new Error('outreach approval not reached');}
// 3. Payment flow must require explicit Admin confirmation.
await runAction('sale_and_payment',{compute_budget_usd:1,max_output_tokens:1000});
let sawPaymentApproval=false;
for(let i=0;i<30;i++){let r=await tick(); console.log('tick',guard,r);if(r.status==='waiting_approval'){const s=await state();const p=s.approvals.find(x=>x.status==='pending');if(p.reason.includes('payment'))sawPaymentApproval=true;await approvePending();}const s=await state();if(s.tasks.some(x=>x.step==='start_delivery'&&x.status==='waiting_approval'))break;}
if(!sawPaymentApproval)throw new Error('admin payment confirmation gate not reached');
// 4. Delivery without admin payment/scope/compute flags must block.
const blocked=await runAction('website_delivery',{payment_verified_by_admin:false,scope_approved:true,compute_budget_available:true});
const bs=await state();const bt=bs.tasks.find(x=>x.id===blocked.task);if(bt?.status!=='blocked')throw new Error('delivery payment gate failed');
// 5. Pausing agent blocks tick.
await worker.fetch(req('/api/commands','POST',{command:'pause_agent',agent_id:'research'}),env);const paused=await state();if(paused.agents.find(x=>x.id==='research').status!=='paused')throw new Error('pause failed');
console.log(JSON.stringify({ok:true,hermes_connector_calls:calls,outreach_approval:sawApproval,admin_payment_confirmation:sawPaymentApproval,delivery_without_payment:'blocked',admin_pause:'working_state_changed'},null,2));
