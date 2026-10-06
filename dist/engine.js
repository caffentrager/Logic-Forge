// MyLogic MFFT reader and browser-independent digital circuit engine.
export function parseMFFT(text){
 const tokens=text.replace(/^\[[^\]]*\]/,'').match(/"(?:\\.|[^"\\])*"|[()]|[^\s()]+/g)||[];let i=0;
 function read(){const t=tokens[i++];if(t==='('){const a=[];while(i<tokens.length&&tokens[i]!==')')a.push(read());if(tokens[i++]!==')')throw Error('닫는 괄호가 없습니다.');return a;}if(t===')')throw Error('잘못된 괄호입니다.');if(t?.startsWith('"')){try{return JSON.parse(t);}catch{return t.slice(1,-1);}}return /^-?\d+(\.\d+)?$/.test(t)?Number(t):t;}
 const out=[];while(i<tokens.length)out.push(read());return out;
}
export const fields=(o,k)=>o.filter(a=>Array.isArray(a)&&a[0]===k);
export const field=(o,k)=>fields(o,k)[0];
export function values(o,k){const f=field(o,k);return Array.isArray(f?.[1])?f[1].slice(1):f?.slice(1)||[];}
export const value=(o,k,d)=>values(o,k)[0]??d;
export const objects=t=>t.filter(a=>Array.isArray(a)&&a[0]==='OBJECT');
export function decodeSymbol(text,key){const all=objects(parseMFFT(text));return {key,name:key.split('/').at(-1),graphics:all.filter(o=>!['DocInfo','DisplayTemplate'].includes(value(o,'OBJECTTYPE'))),pins:all.filter(o=>value(o,'OBJECTTYPE')==='SymbolPort').map(o=>({name:value(field(o,'DisplayInfo')||[],'Value','?'),direction:value(o,'Direction',1),start:values(o,'StartPoint'),end:values(o,'EndPoint'),bubble:value(o,'Bubble')==='TRUE'}))};}
export function decodeCircuit(text){const tree=parseMFFT(text),all=objects(tree);return {name:value(tree,'cellName','Imported'),library:value(tree,'libName','User'),components:all.filter(o=>['InstImp','Port'].includes(value(o,'OBJECTTYPE'))).map(o=>{const t=values(o,'Transform');return {id:'n'+value(o,'OBJECTXID'),name:value(o,'OBJECTNAME'),kind:value(o,'OBJECTTYPE')==='Port'?(value(o,'Direction')===1?'INPUT':'OUTPUT'):'GATE',symbol:value(o,'DescriberName','').replace(/\/symbol$/i,'').toUpperCase(),x:t[2]||0,y:-(t[3]||0),rotation:t[0]||0,mirror:t[1]===-1,portBubbles:fields(o,'InstPort').filter(p=>value(p,'Bubble')==='TRUE').map(p=>value(p,'Name'))};}),wires:all.filter(o=>value(o,'OBJECTTYPE')==='NetSegment').map(o=>{const pts=values(field(o,'Path')||[],'Points');return {id:'w'+value(o,'OBJECTXID'),name:value(o,'OBJECTNAME',''),points:Array.from({length:pts.length/2},(_,i)=>[pts[i*2],-pts[i*2+1]])};}),notes:all.filter(o=>value(o,'OBJECTTYPE')==='Text').map(o=>({text:value(o,'Content',''),position:values(o,'Position')}))};}
export const clone=o=>JSON.parse(JSON.stringify(o));
export function resolveSymbol(c,data){return data.symbols[c.symbol]||data.symbols[Object.keys(data.symbols).find(k=>k.split('/').at(-1)===c.symbol.split('/').at(-1))];}
export function localPoint(c,p){const a=(c.rotation||0)*Math.PI/180,x=p[0]*(c.mirror?-1:1),y=-p[1];return [Math.round(c.x+x*Math.cos(a)-y*Math.sin(a)),Math.round(c.y+x*Math.sin(a)+y*Math.cos(a))];}
export function pinsFor(c,data){if(c.kind!=='GATE')return [{name:c.name,direction:c.kind==='INPUT'?2:1,point:[c.x,c.y],component:c.id}];return (resolveSymbol(c,data)?.pins||[]).map(p=>({...p,component:c.id,point:localPoint(c,p.end)}));}
const key=p=>`${Math.round(p[0]*100)/100},${Math.round(p[1]*100)/100}`;
const onSegment=(p,a,b)=>Math.abs((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))<0.001&&p[0]>=Math.min(a[0],b[0])-0.001&&p[0]<=Math.max(a[0],b[0])+0.001&&p[1]>=Math.min(a[1],b[1])-0.001&&p[1]<=Math.max(a[1],b[1])+0.001;
export function compile(circuit,data){const parent=new Map(),find=k=>{if(!parent.has(k))parent.set(k,k);if(parent.get(k)!==k)parent.set(k,find(parent.get(k)));return parent.get(k);},join=(a,b)=>parent.set(find(a),find(b));const pins=circuit.components.flatMap(c=>pinsFor(c,data));const pts=[...pins.map(p=>p.point),...circuit.wires.flatMap(w=>w.points)];pts.forEach(p=>find(key(p)));for(const w of circuit.wires){for(let i=1;i<w.points.length;i++){const a=w.points[i-1],b=w.points[i];join(key(a),key(b));for(const p of pts)if(onSegment(p,a,b))join(key(a),key(p));}}const nets=new Map();pins.forEach(p=>{p.net=find(key(p.point));if(!nets.has(p.net))nets.set(p.net,[]);nets.get(p.net).push(p);});return {pins,nets,root:p=>find(key(p)),circuit};}
export const invert=v=>v===0?1:v===1?0:'X';
function primitive(type,ins,state={},clockState={},path=''){
 const entries=Object.entries(ins),list=entries.filter(([k])=>!['CE','C','CLK','R','S','CLR','PRE'].includes(k)).map(([,v])=>v), b=Number(type.match(/B(\d+)/)?.[1]||0);
 const args=entries.map(([n,v])=>/^I\d+$/.test(n)&&Number(n.slice(1))<b?invert(v):v);
 let v='X';
 if(/^(AND|NAND)\d*/.test(type))v=args.includes(0)?0:args.every(a=>a===1)?1:'X';
 else if(/^(OR|NOR)\d*/.test(type))v=args.includes(1)?1:args.every(a=>a===0)?0:'X';
 else if(/^(XOR|XNOR)\d*/.test(type))v=args.some(a=>a==='X')?'X':args.reduce((a,b)=>a^b,0);
 else if(/^(INV|NOT|IV)$/.test(type))v=invert(list[0]);
 else if(/^(BUF|IBUF|OBUF|BUFG|IDENTITY)/.test(type))v=list[0]??'X';
 else if(/^(VCC|PULLUP)$/.test(type))v=1;
 else if(/^(GND|PULLDOWN)$/.test(type))v=0;
 else if(/^MUX[2348]$/.test(type)||/^M[248]_1$/.test(type)){const select=Object.entries(ins).filter(([n])=>/^S\d*$/.test(n)).sort().map(([,v])=>v);if(!select.includes('X')){const index=select.reduce((s,v,i)=>s+(v<<i),0);v=ins['I'+index]??ins['D'+index]??ins['IN'+(index+1)]??'X';}}
 else if(/^FD(C|P|R|S|E|CE|PE|RE|SE)?$/.test(type)||type==='DFF'){const ck=ins.C??ins.CLK??0;v=state[path]??0;if(ins.R===1||ins.CLR===1)v=0;else if(ins.S===1||ins.PRE===1)v=1;else if((clockState[path]??0)===0&&ck===1&&(ins.CE??1)===1)v=ins.D??'X';return {O:v,Q:v,_clock:ck,_state:v};}
 else return null;
 if(/^(NAND|NOR|XNOR)/.test(type))v=invert(v);return {O:v,OUT:v,Q:v,_value:v};
}
export function simulate(circuit,data,inputs={},options={}){
 const graph=options.graph||compile(circuit,data),netValues=new Map(),warnings=new Set(),state=options.state||{},clocks=options.clocks||{},pending={};const drivers=new Map();
 const drive=(net,id,v)=>{if(!drivers.has(net))drivers.set(net,new Map());drivers.get(net).set(id,v);const vs=[...drivers.get(net).values()],known=vs.filter(v=>v!=='X');const next=known.length===vs.length&&new Set(known).size===1?known[0]:'X';const old=netValues.get(net)??'X';netValues.set(net,next);return old!==next;};
 graph.pins.filter(p=>circuit.components.find(c=>c.id===p.component)?.kind==='INPUT').forEach(p=>drive(p.net,p.component,inputs[p.name]??0));
 const components=circuit.components.filter(c=>c.kind==='GATE');let stable=false;
 for(let pass=0;pass<components.length+5;pass++){let changed=false;for(const c of components){const pp=graph.pins.filter(p=>p.component===c.id),ins={};for(const p of pp.filter(p=>p.direction===1))ins[p.name]=netValues.get(p.net)??'X';for(const n of c.portBubbles||[])if(n in ins)ins[n]=invert(ins[n]);const type=c.symbol.split('/').at(-1),path=(options.path||'')+c.id;let outputs=primitive(type,ins,state,clocks,path);
 if(!outputs){const sub=data.circuits[type];if(sub&&(options.depth||0)<12){const r=simulate(sub,data,ins,{depth:(options.depth||0)+1,path:path+'/',state,clocks});outputs=r.outputs;r.warnings.forEach(w=>warnings.add(w));Object.assign(pending,r.pending);}else{warnings.add(`${type}: 시뮬레이션 모델 미지원`);outputs={};}}
 if(outputs._clock!==undefined)pending[path]={clock:outputs._clock,state:outputs._state};
 for(const p of pp.filter(p=>p.direction===2)){let v=outputs[p.name]??outputs._value??'X';if((c.portBubbles||[]).includes(p.name))v=invert(v);changed=drive(p.net,c.id+':'+p.name,v)||changed;}
 }if(!changed){stable=true;break;}}
 if(!stable)warnings.add('회로가 안정화되지 않았습니다. 피드백 배선을 확인하세요.');for(const [net,p] of graph.nets){if(!drivers.has(net)&&p.some(p=>p.direction===1))warnings.add('연결되지 않은 입력 핀이 있습니다 (X).');if((drivers.get(net)?.size||0)>1)warnings.add('하나의 배선에 여러 출력이 연결되어 있습니다.');}
 const outputs={};for(const c of circuit.components.filter(c=>c.kind==='OUTPUT'))outputs[c.name]=netValues.get(graph.root([c.x,c.y]))??'X';return {outputs,netValues,graph,warnings:[...warnings],pending};
}
export function truthTable(circuit,data){const inputs=circuit.components.filter(c=>c.kind==='INPUT').map(c=>c.name),outputs=circuit.components.filter(c=>c.kind==='OUTPUT').map(c=>c.name);if(inputs.length>10)throw Error('진리표는 입력 10개 이하에서 생성할 수 있습니다.');if(inputs.length!==new Set(inputs).size)throw Error('입력 이름이 중복됩니다.');const graph=compile(circuit,data),rows=[];for(let v=0;v<2**inputs.length;v++){const ins=Object.fromEntries(inputs.map((n,i)=>[n,(v>>(inputs.length-1-i))&1]));rows.push({...ins,...simulate(circuit,data,ins,{graph}).outputs});}return {inputs,outputs,rows};}
