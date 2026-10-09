import {CameraInput} from './camera-input.js';
import {ui} from './ui-store.js';
import {BrushStroke,brushCells,screenSamples,gestureIntent} from './brush.js';
import {TownMotion,BuildAudio} from './motion.js';
import {renderProfile,reflectionSize,ReflectionBudget,fitTownShadow} from './render-budget.js';
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Reflector } from './vendor/Reflector.js';
import { PALETTE, CELL, BASE, FLOOR, MAX_HEIGHT, LIMIT, key, defaultTown, validateTown, editTown, buildTown, setWindowLight, createBoat, styleOf, chooseColor, createSelection } from './model.js';

const $=id=>document.getElementById(id),canvas=$('world');
let viewport=canvas.getBoundingClientRect();
const touchDevice=window.matchMedia('(pointer: coarse)').matches,quality=renderProfile(touchDevice,devicePixelRatio);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.localClippingEnabled=true;renderer.setPixelRatio(quality.pixelRatio);renderer.setSize(viewport.width,viewport.height,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new THREE.Scene();scene.background=new THREE.Color('#bfd8e3');scene.fog=new THREE.Fog('#bfd8e3',32,110);
const camera=new THREE.PerspectiveCamera(35,viewport.width/viewport.height,.5,140);camera.position.set(13,13,18);
const cameraInput=new CameraInput(canvas),controls=new OrbitControls(camera,cameraInput);controls.target.set(0,1.3,0);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=7;controls.maxDistance=70;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.47;controls.enablePan=true;controls.panSpeed=.7;controls.rotateSpeed=.65;controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};controls.update();
function stopCameraMotion(){const p=camera.position.clone(),t=controls.target.clone(),damping=controls.enableDamping;controls.autoRotate=false;controls.enableDamping=false;controls.update();camera.position.copy(p);controls.target.copy(t);controls.update();controls.enableDamping=damping}
function resetView(){stopCameraMotion();controls.target.set(0,1.3,0);camera.position.set(13,13,18);const factor=Math.max(1,1.02/camera.aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update()}resetView();
const sun=new THREE.DirectionalLight('#fff0d3',3.2);sun.position.set(-30,60,27);sun.castShadow=true;sun.shadow.mapSize.set(quality.shadowSize,quality.shadowSize);sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;scene.add(sun);
const ambient=new THREE.HemisphereLight('#edf7ff','#7895a1',2);scene.add(ambient);

const shader={uniforms:{...THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),time:{value:0},glintStrength:{value:.8},horizonColor:{value:new THREE.Color('#bfd8e3')}},vertexShader:`
  uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vPos;
  void main(){vUv=textureMatrix*vec4(position,1.);vPos=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:`
  uniform vec3 color; uniform sampler2D tDiffuse; uniform float time;
  uniform float glintStrength; uniform vec3 horizonColor;
  varying vec4 vUv; varying vec3 vPos;
  void main(){
    vec2 p=vPos.xz;
    float p0=dot(p,vec2(1.65,.95))+time*.72;
    float p1=dot(p,vec2(-1.1,2.35))-time*.52;
    float p2=dot(p,vec2(4.6,-2.5))+time*.9;
    float a=sin(p0),b=sin(p1);
    // Analytic wave slopes: no normal maps, extra geometry or render passes.
    vec2 slope=.026*vec2(1.65,.95)*cos(p0)
              +.018*vec2(-1.1,2.35)*cos(p1)
              +.006*vec2(4.6,-2.5)*cos(p2);
    vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
    vec3 view=normalize(cameraPosition-vPos);
    float distanceToEye=length(cameraPosition-vPos);
    float fresnel=pow(1.-max(dot(normal,view),0.),3.);
    vec2 uv=vUv.xy/vUv.w+slope*.012;
    vec3 reflection=texture2D(tDiffuse,uv).rgb;
    vec3 sea=color*(1.+a*b*.055);
    vec3 result=mix(sea,reflection,.13+fresnel*.24);
    // Soft sky highlights break into small flowing streaks on crossing ripples.
    vec3 halfVector=normalize(view+normalize(vec3(-.5,.8,-.45)));
    float specular=max(dot(normal,halfVector),0.);
    float crest=sin(p2+a*.65)*sin(dot(p,vec2(-2.1,5.9))-time*.81+b*.45);
    float aa=max(fwidth(crest),.025);
    float sparkle=smoothstep(.62-aa,.94+aa,crest);
    float detail=1.-smoothstep(.65,1.7,fwidth(p2));
    float glint=((.07+.55*pow(specular,40.))*sparkle+.18*pow(specular,160.))*detail;
    glint*=1.-smoothstep(40.,90.,distanceToEye);
    vec3 lightTint=mix(vec3(.62,.8,1.),vec3(1.,.97,.86),glintStrength);
    result+=lightTint*glint*glintStrength;
    result=mix(result,horizonColor,smoothstep(45.,115.,distanceToEye)*.4);
    gl_FragColor=vec4(result,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`};
const reflectionBudget=new ReflectionBudget(),reflectionDimensions=reflectionSize(viewport.width,viewport.height,quality.reflectionEdge);
const water=new Reflector(new THREE.PlaneGeometry(220,220),{color:'#397fa2',textureWidth:reflectionDimensions[0],textureHeight:reflectionDimensions[1],clipBias:.003,multisample:0,shader});water.rotation.x=-Math.PI/2;water.position.y=-.04;scene.add(water);
const renderReflection=water.onBeforeRender;
water.onBeforeRender=function(...args){if(reflectionBudget.take(performance.now()))renderReflection.apply(this,args)};
controls.addEventListener('change',()=>reflectionBudget.invalidate());
const shadowPlane=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.17}));shadowPlane.rotation.x=-Math.PI/2;shadowPlane.position.y=.003;shadowPlane.receiveShadow=true;scene.add(shadowPlane);
const grid=new THREE.GridHelper(CELL*23,23,'#57819d','#57819d');grid.position.set(CELL*.5,-.027,CELL*.5);grid.material.transparent=true;grid.material.opacity=.09;grid.material.depthWrite=false;scene.add(grid);
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),seaPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const groundOutline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL*.97,.014,CELL*.97)),new THREE.LineBasicMaterial({color:'#f1faff',transparent:true,opacity:.7,depthWrite:false}));groundOutline.visible=false;scene.add(groundOutline);
const reducedPreference=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let town=defaultTown(),night=false,mode='build',continuous=false,shiftHeld=false,touchInput=touchDevice,multiTouch=false,selected=-1,selectedStyle=-1,brushSize=1,eraseWhole=true,motionEnabled=!reducedPreference,soundEnabled=true,current=null,undo=[],redo=[],hover=null,toastTimer,frames=0,selectionOverlay=null,hoverSignature='',gesture=null,spaceHeld=false,lastFlush=0;
const activePointers=new Map(),pendingUpdates=new Map();
const STORAGE='little-tide-3d-v2';
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved&&validateTown(saved.town)){town=saved.town;night=!!saved.night;if(Number.isInteger(saved.selected)&&saved.selected>=-1&&saved.selected<PALETTE.length)selected=saved.selected;if(Number.isInteger(saved.selectedStyle)&&saved.selectedStyle>=-1&&saved.selectedStyle<4)selectedStyle=saved.selectedStyle;if([1,3,5].includes(saved.brushSize))brushSize=saved.brushSize;eraseWhole=saved.eraseWhole!==false;if(typeof saved.motionEnabled==='boolean')motionEnabled=saved.motionEnabled;if(typeof saved.soundEnabled==='boolean')soundEnabled=saved.soundEnabled}}catch{}
for(const b of Object.values(town))b.v=styleOf(b);
const motion=new TownMotion(scene,{reduced:!motionEnabled}),audioFeedback=new BuildAudio();audioFeedback.enabled=soundEnabled;
const foamMaterial=new THREE.MeshBasicMaterial({color:'#e7f6fc',transparent:true,opacity:.36,depthWrite:false,side:THREE.DoubleSide}),foamGroup=new THREE.Group();scene.add(foamGroup);
function foamGeometry(){const vertices=[],indices=[],n=16;for(let i=0;i<=n;i++){const x=(i/n-.5)*CELL;vertices.push(x,0,-.035,x,0,.09+.025*Math.sin(i*1.2))}for(let i=0;i<n;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);return g}
const foamGeo=foamGeometry();
function rebuild(save=true){clearHover();if(current){scene.remove(current.root);current.root.traverse(o=>{if(o.isInstancedMesh)o.dispose()});current.pickers.forEach(p=>{if(p.material?.visible===false)p.material.dispose()})}current=buildTown(town);scene.add(current.root);motion.bind(current);
 for(const mesh of foamGroup.children)mesh.dispose();foamGroup.clear();
 if(current.foam.length){const mesh=new THREE.InstancedMesh(foamGeo,foamMaterial,current.foam.length),dummy=new THREE.Object3D();current.foam.forEach((f,i)=>{dummy.rotation.y=f.angle;dummy.position.set(f.x,.011,f.z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true;foamGroup.add(mesh)}
 fitTownShadow(sun,town);renderer.shadowMap.needsUpdate=true;reflectionBudget.invalidate();setWindowLight(night);if(save)persist()}
function syncUI(){ui.update({mode,continuous,shiftHeld,touchInput,selected,selectedStyle,brushSize,eraseWhole,night,motionEnabled,soundEnabled,spaceHeld,autoRotate:controls.autoRotate,grid:grid.visible,canUndo:!!undo.length,canRedo:!!redo.length,count:Object.values(town).filter(b=>b.h>0).length})}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({town,night,selected,selectedStyle,brushSize,eraseWhole,motionEnabled,soundEnabled}));ui.update({saved:true})}catch{ui.update({saved:false})}syncUI()}
function notify(message){ui.update({toast:message});clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.update({toast:''}),2500)}
function lighting(){document.body.classList.toggle('night',night);document.body.classList.toggle('dark',night);scene.background.set(night?'#142738':'#bfd8e3');scene.fog.color.copy(scene.background);water.material.uniforms.color.value.set(night?'#163d58':'#397fa2');water.material.uniforms.glintStrength.value=night?.12:.8;water.material.uniforms.horizonColor.value.copy(scene.background);sun.color.set(night?'#cad7ff':'#fff0d3');sun.intensity=night?.7:3.2;ambient.intensity=night?.62:2;renderer.toneMappingExposure=night?1.05:1.3;reflectionBudget.invalidate();setWindowLight(night);persist()}
rebuild();lighting();
const boat=createBoat();boat.traverse(o=>o.castShadow=false);boat.position.set(-7.3,.03,4.8);boat.rotation.y=-.35;scene.add(boat);
const gulls=[];for(let i=0;i<4;i++){const points=[new THREE.Vector3(-.18,0,0),new THREE.Vector3(0,.05,0),new THREE.Vector3(.18,0,0)],g=new THREE.BufferGeometry().setFromPoints(points),bird=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#faf5df'}));scene.add(bird);gulls.push(bird)}
function pick(e,pickers=current.pickers){const rect=canvas.getBoundingClientRect();mouse.set(((e.clientX-rect.left)/rect.width)*2-1,1-((e.clientY-rect.top)/rect.height)*2);camera.updateMatrixWorld();raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(pickers,false)[0];if(hit){if(hit.object.userData.cell)return hit.object.userData.cell;const run=hit.object.userData.roofRun;if(run){if(run.axis==='z'){const z=Math.max(run.z,Math.min(run.z+run.n-1,Math.floor(hit.point.z/CELL+.5)));return key(run.x,z)}const x=Math.max(run.x,Math.min(run.x+run.n-1,Math.floor(hit.point.x/CELL+.5)));return key(x,run.z)}}const point=new THREE.Vector3();if(raycaster.ray.intersectPlane(seaPlane,point)){const x=Math.floor(point.x/CELL+.5),z=Math.floor(point.z/CELL+.5);if(Math.abs(x)<=LIMIT&&Math.abs(z)<=LIMIT)return key(x,z)}return null}
function clearHover(){if(selectionOverlay){scene.remove(selectionOverlay);selectionOverlay.userData.materials.forEach(m=>m.dispose());selectionOverlay=null}groundOutline.visible=false;hoverSignature=''}
function showHover(k,effectiveMode=mode){hover=k;if(spaceHeld||activePointers.size){clearHover();return}const previewSize=continuous||(!touchInput&&shiftHeld)?brushSize:1;const signature=k+'/'+effectiveMode+'/'+selected+'/'+previewSize;if(hoverSignature===signature)return;clearHover();if(!k)return;if(motion.animations.has(k))return;hoverSignature=signature;const[x,z]=k.split(',').map(Number);selectionOverlay=new THREE.Group();selectionOverlay.userData.materials=[];for(const cell of brushCells(k,previewSize)){if(!town[cell]||motion.animations.has(cell))continue;const color=effectiveMode==='erase'?'#ff756e':effectiveMode==='paint'?(selected>=0?PALETTE[selected]:'#d9efff'):'#eaf6ff',g=createSelection(current,cell,color,effectiveMode==='erase'?.36:effectiveMode==='paint'?.24:.12);selectionOverlay.add(g);selectionOverlay.userData.materials.push(...g.userData.materials)}scene.add(selectionOverlay);if(!town[k]&&(effectiveMode==='build'||effectiveMode==='platform')||previewSize>1){groundOutline.position.set(x*CELL,.02,z*CELL);groundOutline.scale.set(previewSize,1,previewSize);groundOutline.visible=true}}
function queueUpdates(updates,beforeBuilt){for(const u of updates)pendingUpdates.set(u.key,{...u,beforeBuilt});if(updates.length)audioFeedback.play(updates.at(-1).kind)}
function flushUpdates(now=performance.now()){if(!pendingUpdates.size)return;const updates=[...pendingUpdates.values()];pendingUpdates.clear();for(const u of updates)if(u.kind==='remove')motion.removeCell(u.beforeBuilt,u.key,u.after,now);rebuild(false);for(const u of updates)motion.trigger(u,now);motion.update(now);lastFlush=now}
function beginStroke(e){return{kind:'brush',id:e.pointerId,start:e,last:{clientX:e.clientX,clientY:e.clientY},pending:true,stroke:new BrushStroke(town,{mode,selected,style:selectedStyle,size:brushSize,eraseWhole}),beforeBuilt:current,pickers:current.pickers.slice()}}
function movedBeyondSlop(start,e){return Math.hypot(e.clientX-start.clientX,e.clientY-start.clientY)>(start.pointerType==='touch'?9:5)}
function drawStroke(e){if(gesture?.kind!=='brush')return;const g=gesture,now={clientX:e.clientX,clientY:e.clientY};for(const p of screenSamples(g.last,now))queueUpdates(g.stroke.stamp(town,pick(p,g.pickers)),g.beforeBuilt);g.last=now;clearHover()}
function startBrush(){if(gesture?.kind==='brush'&&gesture.pending){gesture.pending=false;drawStroke(gesture.start)}}
function finishGesture(cancel=false){const g=gesture;if(g?.kind==='brush'){if(cancel&&g.stroke.hasChanges){town=g.stroke.cancel();pendingUpdates.clear();motion.reset();rebuild()}else if(g.stroke.hasChanges){flushUpdates();undo.push(g.stroke.before);if(undo.length>80)undo.shift();redo=[];persist()}}gesture=null;clearHover();configureControls()}
function configureControls(){
  controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE=THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;
  controls.touches.ONE=multiTouch?-1:THREE.TOUCH.ROTATE;
  controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  canvas.style.cursor=!spaceHeld&&(continuous||shiftHeld)?'crosshair':'grab';syncUI()
}
function promoteCamera(e){
  const start=gesture.start;gesture={kind:'camera',id:e.pointerId};
  cameraInput.send('pointerdown',start);cameraInput.send('pointermove',e);canvas.style.cursor='grabbing'
}
function commitTap(g){
  const beforeBuilt=current,stroke=new BrushStroke(town,g.options);
  gesture={kind:'brush',stroke};queueUpdates(stroke.stamp(town,g.cell),beforeBuilt);finishGesture()
}
function focusCanvas(){canvas.focus?.({preventScroll:true})}
function pauseOrbit(){stopCameraMotion();syncUI()}
function releasePointer(id){try{if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id)}catch{}}
function resetInput(cancel=false){
  finishGesture(cancel);cameraInput.reset();stopCameraMotion();
  const ids=[...activePointers.keys()];activePointers.clear();multiTouch=false;
  for(const id of ids)releasePointer(id);configureControls()
}
// One owner per gesture: drawing stays out of OrbitControls entirely.
canvas.addEventListener('pointerdown',e=>{
  if(ui.getSnapshot().dialog)return;
  const dismissPanel=!!ui.getSnapshot().panel;
  if(activePointers.has(e.pointerId))return;
  if(e.pointerType==='touch'&&activePointers.size>=2){e.preventDefault();return;}
  if(activePointers.size&&(e.pointerType!=='touch'||[...activePointers.values()].some(p=>p.pointerType!==e.pointerType)))return;
  e.preventDefault();closePanels();focusCanvas();clearHover();
  activePointers.set(e.pointerId,e);touchInput=e.pointerType==='touch';
  try{canvas.setPointerCapture(e.pointerId)}catch{}
  if(dismissPanel){pauseOrbit();gesture={kind:'dismiss',id:e.pointerId};return;}
  if(e.pointerType==='touch'&&activePointers.size>1){
    finishGesture(true);multiTouch=true;pauseOrbit();configureControls();
    gesture={kind:'camera',multi:true};
    // Promote a pending single-finger brush into a two-finger camera gesture.
    for(const event of activePointers.values())if(!cameraInput.pointers.has(event.pointerId))cameraInput.send('pointerdown',event);
    return
  }
  configureControls();pauseOrbit();
  const intent=gestureIntent({button:e.button,space:spaceHeld,continuous,shift:e.shiftKey,pointerType:e.pointerType,touches:activePointers.size});
  if(intent==='camera'){
    gesture={kind:'camera',id:e.pointerId};cameraInput.send('pointerdown',e);canvas.style.cursor='grabbing';
  }else if(intent==='brush')gesture=beginStroke(e);
  else gesture={kind:'pending',id:e.pointerId,start:e,cell:pick(e),options:{mode,selected,style:selectedStyle,size:1,eraseWhole}};
});
canvas.addEventListener('pointermove',e=>{
  if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,e);
  if(gesture?.kind==='camera'){
    if(cameraInput.pointers.has(e.pointerId))cameraInput.send('pointermove',e);
  }else if(gesture?.id===e.pointerId){
    if(gesture.kind==='pending'){if(movedBeyondSlop(gesture.start,e))promoteCamera(e)}
    else{if(gesture.pending){if(!movedBeyondSlop(gesture.start,e))return;startBrush()}drawStroke(e)}
  }else if(!activePointers.size&&e.pointerType!=='touch')showHover(pick(e))
});
function endPointer(e,cancel=false){
  if(!activePointers.has(e.pointerId))return;
  if(gesture?.kind==='pending'&&gesture.id===e.pointerId){
    if(cancel)finishGesture(true);
    else if(movedBeyondSlop(gesture.start,e))promoteCamera(e);
    else commitTap(gesture)
  }else if(gesture?.kind==='brush'&&gesture.id===e.pointerId){
    if(!cancel){const start=gesture.start,wasPending=gesture.pending;startBrush();if(!wasPending||movedBeyondSlop(start,e))drawStroke(e)}
    finishGesture(cancel)
  }
  if(cameraInput.pointers.has(e.pointerId))cameraInput.send(cancel?'pointercancel':'pointerup',e);
  activePointers.delete(e.pointerId);releasePointer(e.pointerId);
  if(!activePointers.size){gesture=null;multiTouch=false;configureControls();clearHover()}
}
canvas.addEventListener('pointerup',e=>endPointer(e));
canvas.addEventListener('pointercancel',e=>endPointer(e,true));
canvas.addEventListener('lostpointercapture',e=>{
  if(!activePointers.has(e.pointerId))return;
  // Recover the actual last coordinates, and clear OrbitControls' tracked pointer too.
  const last=activePointers.get(e.pointerId);
  endPointer(last,true)
});
canvas.addEventListener('pointerleave',()=>{if(!activePointers.size)showHover(null)});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
// The canvas owns touch gestures; UI surfaces retain native scrolling and accessibility zoom.
// Touch-event guards cover Safari defaults without synthesizing duplicate clicks or edits.
for(const type of ['touchstart','touchmove','touchend','gesturestart','gesturechange','dblclick'])canvas.addEventListener(type,e=>{if(e.cancelable)e.preventDefault()},{passive:false});
canvas.addEventListener('wheel',e=>{e.preventDefault();if(!activePointers.size&&!ui.getSnapshot().dialog){pauseOrbit();cameraInput.send('wheel',e)}},{passive:false});
function history(back=true){resetInput();const from=back?undo:redo,to=back?redo:undo;if(!from.length)return;to.push(JSON.stringify(town));const before=current,old=town;town=JSON.parse(from.pop());motion.reset();const updates=[];for(const k of new Set([...Object.keys(old),...Object.keys(town)])){const b=old[k],a=town[k];if(JSON.stringify(a)===JSON.stringify(b))continue;updates.push({key:k,before:b||null,after:a||null,kind:!a?'remove':!b?'new':a.h>b.h?'grow':a.h<b.h?'remove':'paint',beforeBuilt:before})}queueUpdates(updates,before);flushUpdates();persist();showHover(null)}
function setMode(m){if(!['build','erase','platform','paint'].includes(m))return;resetInput();mode=m;configureControls();showHover(hover);closePanels();syncUI()}
function setContinuous(value){const next=!!value;if(next===continuous)return;resetInput();continuous=next;configureControls();clearHover();notify(continuous?'连刷已开启 · 拖动批量编辑':'连刷已关闭 · 拖动环绕')}
function closePanels(){ui.update({panel:null})}
function newTown(){resetInput();undo.push(JSON.stringify(town));redo=[];motion.reset();town=defaultTown();const baseColor=Math.floor(Math.random()*PALETTE.length);for(const b of Object.values(town))if(b.h>0){b.c=(b.c+baseColor)%6;b.v=Math.floor(Math.random()*4);if(Math.random()>.65)b.h=Math.min(4,b.h+1)}rebuild();motion.intro(town);closePanels()}
function clearTown(){resetInput();undo.push(JSON.stringify(town));redo=[];const before=current;for(const[k,b]of Object.entries(town)){motion.removeCell(before,k,null);motion.trigger({key:k,kind:'remove',before:b,after:null})}town={};rebuild();closePanels();ui.update({dialog:null})}
function photo(){clearHover();reflectionBudget.invalidate();renderer.render(scene,camera);canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Little-Tide-3D-'+new Date().toISOString().slice(0,10)+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('已保存照片')})}
Object.assign(ui.actions,{
  setMode,focusCanvas,setContinuous,toggleContinuous:()=>{setContinuous(!continuous);closePanels()},undo:()=>history(),redo:()=>history(false),photo,resetView:()=>{resetInput();resetView()},newTown,clearTown,
  setColor:value=>{if(!Number.isInteger(value)||value<-1||value>=PALETTE.length)return;selected=value;showHover(hover);persist()},
  setStyle:value=>{if(!Number.isInteger(value)||value<-1||value>3)return;selectedStyle=value;persist()},
  setBrushSize:value=>{if(![1,3,5].includes(value))return;resetInput();brushSize=value;if(value>1)setContinuous(true);clearHover();persist()},
  setEraseWhole:value=>{eraseWhole=!!value;persist()},
  toggleDay:()=>{night=!night;lighting()},
  zoom:factor=>{resetInput();camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update()},
  toggleRotate:()=>{controls.autoRotate=!controls.autoRotate;controls.autoRotateSpeed=.8;syncUI()},
  toggleGrid:()=>{grid.visible=!grid.visible;syncUI()},
  toggleMotion:()=>{motionEnabled=!motionEnabled;motion.setReduced(!motionEnabled);renderer.shadowMap.needsUpdate=true;reflectionBudget.invalidate();persist()},
  toggleSound:()=>{soundEnabled=!soundEnabled;audioFeedback.enabled=soundEnabled;persist();if(soundEnabled)audioFeedback.play('new')},
  openPanel:panel=>{if(panel){resetInput();clearHover()}ui.update({panel})},
  openDialog:dialog=>{resetInput();closePanels();ui.update({dialog})}
});
window.addEventListener('keydown',e=>{
  const keyName=e.key.toLowerCase(),editingUI=!!e.target.closest?.('#ui-root,[data-slot],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]');
  const toolbarShortcut=!!e.target.closest?.('.dock')&&(['1','2','3','4','b','c','r'].includes(keyName)||((e.ctrlKey||e.metaKey)&&keyName==='z'));
  if(ui.getSnapshot().dialog||ui.getSnapshot().panel||e.defaultPrevented||e.target.isContentEditable||['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName)||((editingUI||e.target.tagName==='BUTTON')&&!toolbarShortcut))return;
  if(e.key==='Escape'){closePanels();resetInput(true)}
  if(e.key==='Shift'){shiftHeld=true;clearHover();if(!activePointers.size)configureControls()}
  if(e.code==='Space'){e.preventDefault();spaceHeld=true;shiftHeld=e.shiftKey;if(!activePointers.size)configureControls();clearHover();return}
  if(e.ctrlKey||e.metaKey){if(keyName==='z'){e.preventDefault();resetInput();history(!e.shiftKey)}return}
  if(e.altKey)return;
  if(keyName==='b'||keyName==='c'){if(e.repeat)return;e.preventDefault();if(keyName==='b')ui.actions.toggleContinuous();else ui.actions.openPanel('brush');return}
  if(['1','2','3','4'].includes(e.key))setMode(['build','platform','paint','erase'][Number(e.key)-1]);
  if(e.key.toLowerCase()==='r'){resetInput();resetView()}
});
window.addEventListener('keyup',e=>{if(e.code==='Space')spaceHeld=false;if(e.key==='Shift'){shiftHeld=false;clearHover()}if(!activePointers.size)configureControls()});
window.addEventListener('blur',()=>{resetInput(true);spaceHeld=false;shiftHeld=false;configureControls()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput(true);spaceHeld=false;shiftHeld=false;configureControls()}});
function resizeViewport(){
  const rect=canvas.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
  if(rect.width===viewport.width&&rect.height===viewport.height)return;
  resetInput(true);viewport=rect;camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
  renderer.setSize(rect.width,rect.height,false);
  water.getRenderTarget().setSize(...reflectionSize(rect.width,rect.height,quality.reflectionEdge));reflectionBudget.invalidate();
}
window.addEventListener('resize',resizeViewport);
window.visualViewport?.addEventListener('resize',resizeViewport);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeViewport).observe(canvas);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();finishGesture();notify('请刷新页面；小镇已保存')});
$('loading').classList.add('done');setTimeout(()=>$('loading').remove(),600);setMode(mode);ui.update({ready:true});motion.intro(town);
const clock=new THREE.Clock();
function frame(){requestAnimationFrame(frame);if(document.hidden)return;const now=performance.now(),t=clock.getElapsedTime();if(pendingUpdates.size&&now-lastFlush>35)flushUpdates(now);controls.update();if(motion.animations.size){renderer.shadowMap.needsUpdate=true;reflectionBudget.invalidate()}if(motion.ghosts.length)reflectionBudget.invalidate();motion.update(now);if(hover&&!gesture&&!hoverSignature&&!motion.animations.has(hover))showHover(hover);water.material.uniforms.time.value=t;foamMaterial.opacity=.28+Math.sin(t*1.1)*.055;foamGroup.position.y=Math.sin(t*.8)*.009;boat.position.y=.06+Math.sin(t*1.2)*.035;boat.rotation.z=Math.sin(t*.9)*.045;for(let i=0;i<gulls.length;i++){const a=t*.06+i*1.7;gulls[i].position.set(Math.cos(a)*(8+i*.4),5.5+i*.3+Math.sin(t*.5+i)*.1,Math.sin(a)*(7+i*.4));gulls[i].rotation.y=-a;gulls[i].scale.y=.5+Math.sin(t*3+i)*.4}renderer.render(scene,camera);frames++}
frame();
window.littleTide={getState:()=>({town:JSON.parse(JSON.stringify(town)),renderer:'Three.js WebGL',revision:THREE.REVISION,frames,mode,continuous,brushSize,activePointers:activePointers.size,cameraPointers:cameraInput.pointers.size,undoSteps:undo.length,activeAnimations:motion.animations.size,meshes:renderer.info.render.calls,camera:camera.position.toArray(),target:controls.target.toArray()})};
