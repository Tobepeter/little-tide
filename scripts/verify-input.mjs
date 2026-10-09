// Exercise app event wiring with real Three.js / OrbitControls and a DOM/WebGL test double.
// This checks interaction routing; it does not replace browser or GPU visual QA.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {ui} from '../dist/ui-store.js';
import {CameraInput} from '../dist/camera-input.js';
import * as Three from '../dist/vendor/three.module.js';import {OrbitControls} from '../dist/vendor/OrbitControls.js';import {Reflector} from '../dist/vendor/Reflector.js';import * as model from '../dist/model.js';import * as brush from '../dist/brush.js';import * as motion from '../dist/motion.js';import * as rendering from '../dist/render-budget.js';
class Target{
 constructor(id=''){this.id=id;this.events=new Map();this.style={};this.dataset={};this.attributes={};this.children=[];this.classNames=new Set();this.classList={add:(s)=>this.classNames.add(s),remove:(s)=>this.classNames.delete(s),toggle:(s,b)=>{const yes=b??!this.classNames.has(s);yes?this.classNames.add(s):this.classNames.delete(s)},contains:s=>this.classNames.has(s)};this.tagName='BUTTON';this.clientWidth=1400;this.clientHeight=900;this.hidden=true}
 addEventListener(type,fn,opts){const a=this.events.get(type)||[];a.push({fn,capture:opts===true||!!opts?.capture});this.events.set(type,a)}
 removeEventListener(type,fn){this.events.set(type,(this.events.get(type)||[]).filter(x=>x.fn!==fn))}
 emit(type,extra={}){const e={type,target:this,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},button:0,pointerId:1,pointerType:'mouse',ctrlKey:false,metaKey:false,shiftKey:false,...extra};e.pageX??=e.clientX;e.pageY??=e.clientY;for(const l of [...(this.events.get(type)||[])].sort((a,b)=>Number(b.capture)-Number(a.capture)))l.fn(e)}
 setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]}
 appendChild(c){this.children.push(c)}querySelector(){return this.child??=new Target('use')}
 closest(){return null}getRootNode(){return document}getBoundingClientRect(){return this.rect||{left:0,top:0,width:this.clientWidth,height:this.clientHeight}}focus(){document.activeElement=this}setPointerCapture(id){(this.captured??=new Set()).add(id)}hasPointerCapture(id){return this.captured?.has(id)||false}releasePointerCapture(id){this.captured?.delete(id)}remove(){}showModal(){this.open=true}close(){this.open=false}click(){this.onclick?.({target:this})}
}
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Target(m[1])]));const document=new Target('document');document.getElementById=id=>{assert(elements.has(id),'DOM element '+id);return elements.get(id)};document.querySelectorAll=()=>elements.get('palette').children;document.createElement=()=>new Target();document.body=new Target('body');
const window=new Target('window');const mobile=process.argv.includes('--touch');window.matchMedia=query=>({matches:mobile&&query==='(pointer: coarse)'});const storage=new Map();let now=performance.now(),nextFrame;class Renderer{constructor(options){this.options=options;this.shadowMap={};this.shadowUpdates=0;this.renderCount=0;this.info={render:{calls:0}}}setPixelRatio(value){this.pixelRatio=value}setSize(w,h,updateStyle){this.size=[w,h,updateStyle]}render(scene,camera){this.renderCount++;if(this.shadowMap.needsUpdate||this.shadowMap.autoUpdate){this.shadowUpdates++;this.shadowMap.needsUpdate=false}scene.updateMatrixWorld(true);camera.updateMatrixWorld(true)}}
const context=vm.createContext({THREE:{...Three,WebGLRenderer:Renderer},CameraInput,OrbitControls,Reflector,...model,...brush,...motion,...rendering,ui,document,window,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},innerWidth:1400,innerHeight:900,devicePixelRatio:3,performance:{now:()=>now},requestAnimationFrame:fn=>nextFrame=fn,setTimeout:()=>1,clearTimeout(){},confirm:()=>true,console,URL,Math});
const source=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(source,context);const canvas=elements.get('world');canvas.tagName='CANVAS';const state=()=>window.littleTide.getState();const getCamera=()=>vm.runInContext('camera',context);function point(x,z,y=0){const p=new Three.Vector3(x*model.CELL,y,z*model.CELL).project(getCamera());const rect=canvas.getBoundingClientRect();return{clientX:rect.left+(p.x+1)*rect.width/2,clientY:rect.top+(1-p.y)*rect.height/2}}
function pointer(type,p,extra={}){canvas.emit(type,{...p,...extra})}function advance(ms){now+=ms;nextFrame()}
advance(2500);
const snapshot=()=>JSON.stringify(state().town);
const main={pointerId:1,pointerType:mobile?'touch':'mouse'};
const press=(type,p,extra={})=>pointer(type,p,{...main,...extra});
const tap=(p,extra={})=>{press('pointerdown',p,extra);press('pointerup',p,extra)};
const drag=(from,to,extra={})=>{press('pointerdown',from,extra);press('pointermove',to,extra);press('pointerup',to,extra)};
const center={clientX:650,clientY:390},away={clientX:745,clientY:435};
assert.equal(state().mode,'build');assert.equal(state().continuous,false,'Every device starts with tap + orbit');
// Every printed key maps to an action, including when a toolbar button has keyboard focus.
for(const [key,tool] of [['1','build'],['2','platform'],['3','paint'],['4','erase']]){window.emit('keydown',{key,target:canvas});assert.equal(state().mode,tool)}
window.emit('keydown',{key:'b',target:canvas});assert.equal(state().continuous,true);window.emit('keydown',{key:'b',repeat:true,target:canvas});assert.equal(state().continuous,true,'Holding B does not repeatedly toggle');window.emit('keydown',{key:'b',ctrlKey:true,target:canvas});assert.equal(state().continuous,true,'Browser modifier shortcuts are not hijacked');window.emit('keydown',{key:'b',target:canvas});assert.equal(state().continuous,false);
window.emit('keydown',{key:'c',target:canvas});assert.equal(ui.getSnapshot().panel,'brush');window.emit('keydown',{key:'1',target:canvas});assert.equal(state().mode,'erase','Open panels keep their own keyboard focus');ui.actions.openPanel(null);
const toolbarButton=new Target('toolbar-button');toolbarButton.closest=selector=>selector==='.dock'?toolbarButton:null;window.emit('keydown',{key:'2',target:toolbarButton});assert.equal(state().mode,'platform','Visible tool keys work from toolbar focus');window.emit('keydown',{key:'1',target:toolbarButton});assert.equal(state().mode,'build');

const initial=snapshot(),first=point(5,5);press('pointerdown',first);advance(400);assert.equal(snapshot(),initial,'Holding does not edit or enter brush mode');press('pointermove',{clientX:first.clientX+2,clientY:first.clientY+2});assert.equal(snapshot(),initial);press('pointerup',{clientX:first.clientX+2,clientY:first.clientY+2});assert.equal(state().town['5,5'].h,1,'Small finger jitter still edits the press target');assert.equal(state().undoSteps,1);assert.equal(document.activeElement.id,'world');
// Tap/drag intent latches: returning to the press position must never edit.
for(const tool of ['build','platform','paint','erase']){
 ui.actions.setMode(tool);ui.actions.resetView();const before=snapshot(),cam=state().camera.slice(),history=state().undoSteps;
 press('pointerdown',center);press('pointermove',away);press('pointermove',center);press('pointerup',center);assert.equal(snapshot(),before,'Orbit never edits in '+tool);assert.equal(state().undoSteps,history);assert.notDeepEqual(state().camera,cam,'Direct drag rotates in '+tool);
 ui.actions.resetView();const beforeFast=snapshot();press('pointerdown',center);press('pointerup',away);assert.equal(snapshot(),beforeFast,'Fast swipe without intermediate move is not a tap');
}
ui.actions.setMode('paint');ui.actions.resetView();ui.actions.setColor(2);tap(point(5,5,model.BASE+model.FLOOR+.35));assert.equal(state().town['5,5'].c,2,'Tap paints');ui.actions.setMode('erase');tap(point(5,5,model.BASE+model.FLOOR+.35));assert(!state().town['5,5'],'Tap erases');
// Explicit continuous brush is available on both devices, as one undoable stroke.
ui.actions.setMode('build');ui.actions.resetView();ui.actions.toggleContinuous();assert.equal(state().continuous,true);const beforeBrush=snapshot(),camBeforeBrush=state().camera.slice(),historyBeforeBrush=state().undoSteps;
const a=point(4,4),b=point(5,4),c=point(6,4);press('pointerdown',a);assert.equal(snapshot(),beforeBrush,'Even brush mode defers the first stamp for a possible pinch');press('pointermove',b);press('pointermove',c);press('pointermove',a);press('pointerup',c);
for(const x of [4,5,6])assert.equal(state().town[model.key(x,4)]?.h,1,'Continuous stroke visits each cell once');assert.equal(state().undoSteps,historyBeforeBrush+1);assert.deepEqual(state().camera,camBeforeBrush);const brushed=snapshot();ui.actions.undo();assert.equal(snapshot(),beforeBrush);ui.actions.redo();assert.equal(snapshot(),brushed);
ui.actions.toggleContinuous();const afterBrush=snapshot();drag(center,away);assert.equal(snapshot(),afterBrush,'Disabling continuous restores orbit immediately');
// Choosing a wide brush enables continuous editing; explicitly switching it off restores single taps.
ui.actions.resetView();ui.actions.setBrushSize(3);assert.equal(state().continuous,true,'Selecting a wide brush enables batch editing');ui.actions.setContinuous(false);const beforeSingle=Object.keys(state().town).length;tap(point(-5,5));assert.equal(Object.keys(state().town).length,beforeSingle+1);ui.actions.toggleContinuous();const beforeWide=Object.keys(state().town).length;tap(point(-5,7));assert.equal(Object.keys(state().town).length,beforeWide+9);ui.actions.setMode('paint');assert.equal(state().continuous,true,'Switching tools preserves batch editing');ui.actions.setContinuous(false);ui.actions.setBrushSize(1);ui.actions.setMode('build');
// Shift is optional and mouse-only; changing it mid-gesture never reassigns ownership.
ui.actions.resetView();const beforeShift=snapshot();drag(point(7,3),point(8,3),{pointerType:'mouse',shiftKey:true});assert.notEqual(snapshot(),beforeShift);assert.equal(state().continuous,false,'Shift does not latch the toggle');
ui.actions.resetView();const beforeMid=snapshot();press('pointerdown',center);press('pointermove',away);window.emit('keydown',{key:'Shift',shiftKey:true,target:canvas});press('pointermove',{clientX:800,clientY:440});press('pointerup',{clientX:800,clientY:440});window.emit('keyup',{key:'Shift',target:canvas});assert.equal(snapshot(),beforeMid,'Mid-drag Shift cannot change orbit into edits');
const touch=(type,x,y,id)=>pointer(type,{clientX:x,clientY:y},{pointerId:id,pointerType:'touch'});
const distance=()=>new Three.Vector3(...state().camera).distanceTo(new Three.Vector3(...state().target));
for(const tool of ['build','platform','paint','erase'])for(const batch of [false,true]){
 ui.actions.setMode(tool);if(state().continuous!==batch)ui.actions.toggleContinuous();ui.actions.resetView();const before=snapshot(),d=distance(),target=state().target.slice(),history=state().undoSteps;
 touch('pointerdown',650,400,21);touch('pointerdown',750,400,22);touch('pointermove',630,440,21);touch('pointermove',830,460,22);
 assert(Math.abs(distance()-d)>.1,'Pinch zoom works in '+tool+'/'+batch);assert.notDeepEqual(state().target,target,'Two-finger pan works');touch('pointerup',630,440,21);const afterLift=state().camera.slice();touch('pointermove',900,500,22);assert.deepEqual(state().camera,afterLift,'Remaining finger is parked');touch('pointerup',900,500,22);assert.equal(snapshot(),before,'Multi-touch never edits');assert.equal(state().undoSteps,history);assert.equal(state().activePointers,0);assert.equal(state().cameraPointers,0);
}
// A second finger also rolls back a brush that has already begun moving.
ui.actions.setMode('build');ui.actions.setContinuous(true);ui.actions.resetView();const beforePromotion=snapshot(),historyBeforePromotion=state().undoSteps;const pa=point(-3,5),pb=point(-2,5);press('pointerdown',pa,{pointerId:31,pointerType:'touch'});press('pointermove',pb,{pointerId:31,pointerType:'touch'});assert.notEqual(snapshot(),beforePromotion);touch('pointerdown',800,350,32);assert.equal(snapshot(),beforePromotion);touch('pointercancel',800,350,32);press('pointerup',pb,{pointerId:31,pointerType:'touch'});assert.equal(state().undoSteps,historyBeforePromotion);assert.equal(state().cameraPointers,0);
// Cancel and focus/capture loss cannot produce a pending edit or a stuck camera.
ui.actions.toggleContinuous();ui.actions.resetView();const beforeCancel=snapshot();press('pointerdown',point(-3,6));press('pointercancel',point(-3,6));assert.equal(snapshot(),beforeCancel);press('pointerdown',point(-3,6));canvas.emit('lostpointercapture',{pointerId:1});assert.equal(snapshot(),beforeCancel);
ui.actions.toggleContinuous();press('pointerdown',pa);press('pointermove',pb);window.emit('keydown',{key:'Escape',target:canvas});press('pointerup',pb);assert.equal(snapshot(),beforeCancel,'Escape rolls back entire brush');ui.actions.toggleContinuous();
press('pointerdown',center);press('pointermove',away);canvas.emit('lostpointercapture',{pointerId:1});assert.equal(state().activePointers,0);assert.equal(state().cameraPointers,0);let cam=state().camera.slice();drag(center,away);assert.notDeepEqual(state().camera,cam,'Orbit restarts after capture loss');press('pointerdown',center);window.emit('blur');assert.equal(state().cameraPointers,0);cam=state().camera.slice();drag(center,away);assert.notDeepEqual(state().camera,cam,'Orbit restarts after blur');
// Desktop fallbacks stay compatible; space overrides continuous brush without switching it off.
ui.actions.toggleContinuous();const beforeSpace=snapshot();window.emit('keydown',{code:'Space',key:' ',target:canvas});drag(center,away,{pointerType:'mouse'});window.emit('keyup',{code:'Space',key:' '});assert.equal(snapshot(),beforeSpace);assert.equal(state().continuous,true);
for(const button of [1,2]){ui.actions.resetView();const target=state().target.slice(),before=snapshot();drag(center,away,{pointerType:'mouse',button});assert.notDeepEqual(state().target,target);tap(center,{pointerType:'mouse',button});assert.equal(snapshot(),before,'Navigation buttons never edit')}
ui.actions.resetView();const d=distance();canvas.emit('wheel',{deltaY:-100,deltaMode:0,clientX:700,clientY:450});assert(distance()<d);
ui.actions.resetView();assert.deepEqual(state().target,[0,1.3,0]);assert(state().camera.every((v,i)=>Math.abs(v-[13,13,18][i])<1e-9));
ui.actions.openDialog('help');window.emit('keydown',{key:'4',target:canvas});assert.equal(state().mode,'build');ui.update({dialog:null});const button=new Target('ui-button');window.emit('keydown',{key:'4',target:button});assert.equal(state().mode,'build');
ui.actions.setStyle(3);ui.actions.setColor(4);const saved=JSON.parse(storage.get('little-tide-3d-v2'));assert.equal(saved.selectedStyle,3);assert.equal(saved.selected,4);assert(!('continuous' in saved),'Continuous editing intentionally resets on page load');
// Batch painting and erasing survive tool changes; each stroke remains one undo step.
ui.actions.setContinuous(true);ui.actions.setBrushSize(1);ui.actions.setMode('paint');ui.actions.setColor(1);
ui.actions.resetView();const beforePaint=snapshot(),paintHistory=state().undoSteps;
drag(point(4,4,model.BASE+model.FLOOR),point(6,4,model.BASE+model.FLOOR));
assert.equal(state().town['4,4'].c,1);assert.equal(state().town['6,4'].c,1);assert.equal(state().undoSteps,paintHistory+1);ui.actions.undo();assert.equal(snapshot(),beforePaint);
ui.actions.setMode('erase');assert(state().continuous);const eraseHistory=state().undoSteps;
drag(point(4,4,model.BASE+model.FLOOR),point(6,4,model.BASE+model.FLOOR));assert(!state().town['4,4']);assert(!state().town['6,4']);assert.equal(state().undoSteps,eraseHistory+1);ui.actions.undo();
// Tapping outside a popover dismisses it without placing/deleting an underlying house.
const beforeDismiss=snapshot();ui.actions.openPanel('brush');tap(point(4,4,model.BASE+model.FLOOR));assert.equal(ui.getSnapshot().panel,null);assert.equal(snapshot(),beforeDismiss);assert.equal(state().activePointers,0);
ui.actions.openPanel('brush');touch('pointerdown',650,400,81);touch('pointerdown',750,400,82);touch('pointermove',800,430,82);touch('pointerup',650,400,81);touch('pointerup',800,430,82);assert.equal(snapshot(),beforeDismiss,'Dismissing a panel cannot turn a following pinch into painting');assert.equal(state().cameraPointers,0);
// Phone viewport and inset coordinates use the actual canvas, not stale window dimensions.
ui.actions.clearTown();ui.actions.setMode('build');ui.actions.setContinuous(false);ui.actions.setBrushSize(1);
canvas.rect={left:0,top:24,width:430,height:820};canvas.clientWidth=430;canvas.clientHeight=820;window.emit('resize');ui.actions.resetView();
assert.equal(getCamera().aspect,430/820);assert.deepEqual(Array.from(vm.runInContext('renderer.size',context)),[430,820,false]);
const phoneCamera=state().camera.slice(),phoneTap=point(-2,2);
for(let i=0;i<2;i++){pointer('pointerdown',phoneTap,{pointerType:'touch'});pointer('pointerup',phoneTap,{pointerType:'touch'});advance(100)}
assert.equal(state().town['-2,2'].h,2,'Rapid taps stack houses without moving the camera');assert.deepEqual(state().camera,phoneCamera);
for(const type of ['touchstart','touchmove','touchend','gesturestart','gesturechange','dblclick']){let prevented=false;canvas.emit(type,{cancelable:true,preventDefault:()=>prevented=true});assert(prevented,'Canvas prevents native '+type)}
ui.actions.setContinuous(true);const beforeLost=snapshot();const start=point(0,2),end=point(1,2);
touch('pointerdown',start.clientX,start.clientY,51);touch('pointermove',end.clientX,end.clientY,51);assert.notEqual(snapshot(),beforeLost);canvas.emit('lostpointercapture',{pointerId:51});assert.equal(snapshot(),beforeLost,'Interrupted brush rolls back');assert.equal(state().activePointers,0);
// Rotating or resizing the phone cancels an in-flight stroke and clears camera ownership.
touch('pointerdown',start.clientX,start.clientY,61);touch('pointermove',end.clientX,end.clientY,61);
canvas.rect={left:47,top:0,width:750,height:390};canvas.clientWidth=750;canvas.clientHeight=390;window.emit('resize');assert.equal(snapshot(),beforeLost);assert.equal(state().activePointers,0);assert.equal(state().cameraPointers,0);assert.equal(getCamera().aspect,750/390);ui.actions.resetView();
const landscape=point(0,2);pointer('pointerdown',landscape,{pointerType:'touch'});pointer('pointerup',landscape,{pointerType:'touch'});assert(state().town['0,2'],'Picking works with landscape safe-area offset');
ui.actions.setContinuous(false);const beforeThree=snapshot();touch('pointerdown',300,150,71);touch('pointerdown',400,150,72);touch('pointerdown',500,150,73);assert.equal(state().activePointers,2,'Third finger does not corrupt the two-finger camera gesture');touch('pointermove',420,180,72);touch('pointerup',500,150,73);touch('pointerup',300,150,71);touch('pointerup',420,180,72);assert.equal(snapshot(),beforeThree);assert.equal(state().cameraPointers,0);
// Real app scheduling uses cached shadows, including the final settled pose.
const renderer=vm.runInContext('renderer',context);advance(2500);advance(16);
const shadowUpdates=renderer.shadowUpdates;advance(16);advance(16);assert.equal(renderer.shadowUpdates,shadowUpdates,'Static town shadows are reused');
ui.actions.toggleMotion();assert(renderer.shadowMap.needsUpdate,'Disabling motion refreshes shadows after resetting poses');advance(16);
assert.equal(renderer.pixelRatio,mobile?1.5:1.7);assert.equal(renderer.options.preserveDrawingBuffer,false);
const target=vm.runInContext('water.getRenderTarget()',context);assert(Math.max(target.width,target.height)<=(mobile?512:1024));assert(Math.abs(target.width/target.height-750/390)<.01,'Reflection follows phone orientation');
const rendered=renderer.renderCount;document.hidden=true;document.emit('visibilitychange');advance(16);assert.equal(renderer.renderCount,rendered);document.hidden=false;advance(16);assert(renderer.renderCount>rendered);
let capturedAt=0;canvas.toBlob=()=>{capturedAt=renderer.renderCount};const beforePhoto=renderer.renderCount;ui.actions.photo();assert.equal(capturedAt,beforePhoto+1,'Photo capture immediately follows a fresh render without preserving the buffer');
console.log('PASS: '+(mobile?'touch':'mouse')+' defaults, release-only taps, jitter tolerance, drag-return and fast-swipe rejection, direct orbit in every tool, single-cell taps, continuous brush/undo, Shift shortcut, pinch/pan in all modes, brush rollback, remaining-finger lock, cancel/capture/blur recovery, focus, persistence, batch tool switching, native gesture guards, phone portrait/landscape picking, resize rollback, third-finger rejection, cached shadow scheduling, mobile render targets, hidden-page pause, photo capture ordering.');
