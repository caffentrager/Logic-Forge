import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clone,decodeCircuit,pinsFor,simulate,truthTable,primitive} from '../dist/engine.js';
import {encodeMFFT,makeSymbol,copyCircuitSelection,pasteCircuitSelection,parseStimulus,stimulusAt,exportVCD} from '../dist/formats.js';
import {flattenCircuit,exportVerilog,exportVHDL,exportEDIF} from '../dist/hdl.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data.json',import.meta.url)));
test('Native schematic round trip preserves every exercise truth table',()=>{
 for(const c of Object.values(data.circuits)){const restored=decodeCircuit(encodeMFFT(c,data));assert.deepEqual(truthTable(restored,data),truthTable(c,data),c.name);}
});
test('Native drawings, Korean text and transforms survive save and reload',()=>{
 const c=clone(data.circuits.HA);c.components[0].rotation=90;c.components[0].mirror=true;
 c.figures=['Line','Rect','Circle','Arc','Text'].map((kind,i)=>({id:'f'+i,kind,x:10,y:20,x2:70,y2:80,text:'실습 도면',size:20}));
 const r=decodeCircuit(encodeMFFT(c,data));assert.equal(r.components[0].rotation,90);assert.equal(r.components[0].mirror,true);assert.deepEqual(r.figures.map(f=>f.kind),c.figures.map(f=>f.kind));assert.equal(r.figures.at(-1).text,'실습 도면');
});
test('Clipboard preserves internal wiring and avoids shared objects and duplicate names',()=>{
 const c=clone(data.circuits.HA),clipboard=copyCircuitSelection(c,c.components.map(c=>c.id),data);let id=0;
 const pasted=pasteCircuitSelection(c,clipboard,[800,800],()=> 'copy'+id++);
 assert.equal(pasted.wires.length,c.wires.length);assert.ok(pasted.components.every(p=>!c.components.some(c=>c.name===p.name)));
 const pc={...c,components:pasted.components,wires:pasted.wires};const ports=pc.components.filter(c=>c.kind==='INPUT');
 const r=simulate(pc,data,Object.fromEntries(ports.map(p=>[p.name,1])));assert.deepEqual(Object.values(r.outputs).sort(),[0,1]);
 pasted.wires[0].points[0][0]=0;assert.notEqual(clipboard.wires[0].points[0][0],0);
});
test('Made symbols work as hierarchical components',()=>{
 const c=data.circuits.HA,{symbol}=makeSymbol(c,'CUSTOM_HA'),d={...data,symbols:{...data.symbols,[symbol.key]:symbol},circuits:{...data.circuits,CUSTOM_HA:c}};
 const gate={id:'gate',kind:'GATE',symbol:symbol.key,name:'I0',x:0,y:0},parts=[gate],wires=[];
 for(const p of pinsFor(gate,d)){const kind=p.direction===1?'INPUT':'OUTPUT',x=p.point[0]+(kind==='INPUT'?-40:40);parts.push({id:p.name,name:p.name,kind,x,y:p.point[1]});wires.push({id:p.name,points:[[x,p.point[1]],p.point]});}
 assert.deepEqual(simulate({components:parts,wires},d,{A:1,B:1}).outputs,{S:0,C:1});
});
test('CLOCK, GEN, VECTOR, WATCH, unknowns and malformed stimuli',()=>{
 const s=parseStimulus('CLOCK A FROM:0 TO:100 STEPSIZE:10 0 1; GEN A X@15 1@30; GEN B 1@0 Z@5; VECTOR AB A B; WATCH AB; MAX_TIME 100;',['A','B']);
 assert.deepEqual(stimulusAt(s,0),{A:0,B:1});assert.deepEqual(stimulusAt(s,15),{A:'X',B:'Z'});assert.equal(stimulusAt(s,20).A,0);assert.equal(stimulusAt(s,30).A,1);assert.deepEqual(s.vectors.AB,['A','B']);
 assert.throws(()=>parseStimulus('CLOCK A FROM:0 TO:20 STEPSIZE:0 0 1;',['A']));assert.throws(()=>parseStimulus('GEN MISSING 1@0;',['A']));
 assert.match(exportVCD([{time:0,values:{A:1}},{time:15,values:{A:'X'}}],['A']),/#15\nxs0/);
});
test('Sequential, tri-state and memory models honor state and control signals',()=>{
 assert.equal(primitive('BUFT',{I:1,T:1})._value,'Z');assert.equal(primitive('BUFT',{I:1,T:0})._value,1);
 assert.equal(primitive('LATCH',{D:1,EN:1},{q:0},{},'q').Q,1);assert.equal(primitive('LATCH',{D:0,EN:0},{q:1},{},'q').Q,1);
 assert.equal(primitive('JKFF',{J:1,K:1,CK:1},{q:1},{q:0},'q').Q,0);
 let r=primitive('MEMORY',{A:2,I:1,CS:1,WE:1},{},{},'m');assert.equal(r.T,1);assert.equal(primitive('MEMORY',{A:2,CS:1,WE:0},{m:r._state},{},'m').T,1);assert.equal(primitive('MEMORY',{A:2,CS:0},{m:r._state},{},'m').T,'Z');
});
test('Library netlist decoder models retain decoder behavior',()=>{
 const c=data.models['SPARTAN/X74_138'];assert.ok(c,'X74_138 original model');
 for(let address=0;address<8;address++){const ins={A:address&1,B:(address>>1)&1,C:(address>>2)&1,G1:1,G2A:0,G2B:0};const r=simulate(c,data,ins);assert.deepEqual(r.warnings,[]);for(let i=0;i<8;i++)assert.equal(r.outputs['Y'+i],i===address?0:1);}
});
test('Flattened HDL graph agrees with hierarchical simulation',()=>{
 for(const c of [data.circuits.HA,data.circuits.FA,data.circuits.ADDER4BIT]){
  const m=flattenCircuit(c,data);const rows=truthTable(c,data).rows;
  for(const row of rows){const values=Object.fromEntries(m.ports.filter(p=>p.direction==='INPUT').map(p=>[p.name,row[p.original]]));
   const read=p=>p.inverse?(values[p.net]===1?0:values[p.net]===0?1:'X'):(values[p.net]??'X');
   for(let i=0;i<m.gates.length+5;i++){for(const [a,b] of m.assignments)values[a]=typeof b==='string'?(values[b]??'X'):read(b);for(const g of m.gates){const r=primitive(g.type,Object.fromEntries(Object.entries(g.inputs).map(([n,p])=>[n,read(p)])));for(const [n,p]of Object.entries(g.outputs)){const v=r[n]??r._value;values[p.net]=p.inverse?1-v:v;}}}
   for(const p of m.ports.filter(p=>p.direction==='OUTPUT'))assert.equal(values[p.name],row[p.original],c.name+' '+p.original);
  }
  assert.match(exportVerilog(c,data),/endmodule/);assert.match(exportVHDL(c,data),/end structural;/);assert.match(exportEDIF(c,data),/edifVersion 2 0 0/);
 }
});
