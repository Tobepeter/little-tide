// Real React + Radix components in jsdom; not a browser or GPU visual test.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body><canvas id="world" tabindex="0"></canvas><div id="ui-root"></div></body></html>',{url:'https://little-tide.test',pretendToBeVisual:true});
const {window}=dom;
for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLFormElement','DocumentFragment','HTMLSelectElement','HTMLButtonElement','Element','Node','NodeFilter','MutationObserver','CustomEvent','Event','KeyboardEvent','MouseEvent','getComputedStyle'])Object.defineProperty(globalThis,key,{value:key==='window'?window:key==='document'?window.document:window[key],configurable:true});
globalThis.requestAnimationFrame=window.requestAnimationFrame.bind(window);globalThis.cancelAnimationFrame=window.cancelAnimationFrame.bind(window);
globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};window.ResizeObserver=globalThis.ResizeObserver;
window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLElement.prototype.hasPointerCapture=()=>false;window.HTMLElement.prototype.setPointerCapture=function(){};window.HTMLElement.prototype.releasePointerCapture=function(){};
window.PointerEvent=class extends window.MouseEvent{constructor(type,props={}){super(type,props);this.pointerId=props.pointerId??1;this.pointerType=props.pointerType??'mouse';this.isPrimary=props.isPrimary??true}};globalThis.PointerEvent=window.PointerEvent;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const output=new URL('./.ui-test.mjs',import.meta.url);
await build({entryPoints:['src/App.jsx'],bundle:true,format:'esm',platform:'node',jsx:'automatic',outfile:output.pathname,alias:{'@':'./src'},packages:'external',plugins:[{name:'store-path',setup(b){b.onResolve({filter:/^\.\/ui-store\.js$/},()=>({path:path.resolve('dist/ui-store.js'),external:true}))}}]});
try{
const React=await import('react');const {render,screen,within,act,cleanup}=await import('@testing-library/react');const {default:userEvent}=await import('@testing-library/user-event');const {App}=await import(output.href);const {ui}=await import('../dist/ui-store.js');
let clearCount=0,photos=0;
Object.assign(ui.actions,{
 focusCanvas:()=>document.getElementById('world').focus(),toggleContinuous:()=>ui.update({continuous:!ui.getSnapshot().continuous}),setMode:mode=>ui.update({mode,panel:null}),setContinuous:continuous=>ui.update({continuous}),setColor:selected=>ui.update({selected}),setStyle:selectedStyle=>ui.update({selectedStyle}),setBrushSize:brushSize=>ui.update({brushSize,...(brushSize>1?{continuous:true}:{})}),setEraseWhole:eraseWhole=>ui.update({eraseWhole}),
 openPanel:panel=>ui.update({panel}),openDialog:dialog=>ui.update({dialog,panel:null}),toggleMotion:()=>ui.update({motionEnabled:!ui.getSnapshot().motionEnabled}),toggleSound:()=>ui.update({soundEnabled:!ui.getSnapshot().soundEnabled}),toggleDay:()=>ui.update({night:!ui.getSnapshot().night}),clearTown:()=>{clearCount++;ui.update({dialog:null,canUndo:true})},photo:()=>photos++,newTown:()=>ui.update({panel:null}),toggleGrid:()=>{},toggleRotate:()=>{},undo:()=>{},redo:()=>{},resetView:()=>{},zoom:()=>{}
});
ui.update({ready:true});const user=userEvent.setup({document:window.document});render(React.createElement(App),{container:document.getElementById('ui-root')});
assert(screen.getByRole('button',{name:'撤销'}).disabled);
for(const [name,key] of [['建造','1'],['平台','2'],['上色','3'],['拆除','4']]){const button=screen.getByRole('radio',{name});assert.equal(button.querySelector('.keycap-tool').textContent,key);assert.equal(button.getAttribute('aria-keyshortcuts'),key)}
assert.equal(screen.getByRole('button',{name:'连续刷'}).querySelector('.keycap-tool').textContent,'B');assert.equal(screen.getByRole('button',{name:'笔刷与颜色'}).querySelector('.keycap-tool').textContent,'C');assert(screen.getByRole('toolbar',{name:'搭建工具'}).contains(screen.getByRole('button',{name:'连续刷'})),'Continuous brush is integrated into one toolbar');assert(!document.querySelector('.view-tools'),'No detached side toolbar');

await user.click(screen.getByRole('button',{name:'更多'}));await user.click(screen.getByRole('menuitem',{name:'拍照'}));assert.equal(photos,1);await user.keyboard('{Escape}');
await user.click(screen.getByRole('button',{name:'笔刷与颜色'}));assert.equal(ui.getSnapshot().panel,'brush');assert(screen.getByRole('dialog'));
await user.click(screen.getByRole('button',{name:'珊瑚红'}));assert.equal(ui.getSnapshot().selected,0);
await user.click(screen.getByRole('button',{name:'随机'}));assert.equal(ui.getSnapshot().selected,-1);
await user.click(screen.getByRole('radio',{name:'3 × 3 笔刷'}));assert.equal(ui.getSnapshot().brushSize,3);assert.equal(screen.getByRole('button',{name:'连续刷'}).getAttribute('aria-pressed'),'true');
await user.click(screen.getByRole('combobox',{name:'房型'}));assert(screen.getByRole('listbox'));await user.click(screen.getByRole('option',{name:'木构小屋'}));assert.equal(ui.getSnapshot().selectedStyle,3);
await user.keyboard('{Escape}');assert.equal(ui.getSnapshot().panel,null);assert.equal(document.activeElement.getAttribute('aria-label'),'笔刷与颜色');
await user.click(screen.getByRole('radio',{name:'拆除'}));assert.equal(ui.getSnapshot().mode,'erase');
await user.click(screen.getByRole('button',{name:'笔刷与颜色'}));await user.click(screen.getByRole('radio',{name:'一层'}));assert.equal(ui.getSnapshot().eraseWhole,false);await user.keyboard('{Escape}');
await user.click(screen.getByRole('button',{name:'更多'}));assert(screen.getByRole('menu'));
await user.click(screen.getByRole('menuitemcheckbox',{name:'动画'}));assert.equal(ui.getSnapshot().motionEnabled,false);assert.equal(ui.getSnapshot().panel,'menu');
await user.click(screen.getByRole('menuitemcheckbox',{name:'音效'}));assert.equal(ui.getSnapshot().soundEnabled,false);
await user.click(screen.getByRole('menuitem',{name:'操作帮助'}));assert.equal(ui.getSnapshot().dialog,'help');assert(screen.getByRole('dialog',{name:'操作方式'}));
await user.keyboard('{Escape}');assert.equal(ui.getSnapshot().dialog,null);assert.equal(document.activeElement.id,'more');
await user.click(screen.getByRole('button',{name:'更多'}));await user.click(screen.getByRole('menuitem',{name:'清空小镇'}));const dialog=screen.getByRole('alertdialog');assert.equal(clearCount,0);await user.click(within(dialog).getByRole('button',{name:'取消'}));assert.equal(clearCount,0);
await user.click(screen.getByRole('button',{name:'更多'}));await user.click(screen.getByRole('menuitem',{name:'清空小镇'}));await user.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'清空'}));assert.equal(clearCount,1);assert(!screen.getByRole('button',{name:'撤销'}).disabled);
assert(!screen.queryByRole('radio',{name:'视角'}),'No extra navigation modes');
await user.click(screen.getByRole('radio',{name:'建造'}));assert.equal(document.activeElement.id,'world');
await act(()=>ui.actions.setContinuous(false));const continuous=screen.getByRole('button',{name:'连续刷'});assert.equal(continuous.getAttribute('aria-pressed'),'false');await user.click(continuous);assert.equal(ui.getSnapshot().continuous,true);assert.equal(continuous.getAttribute('aria-pressed'),'true');assert.equal(document.activeElement.id,'world');
await user.click(screen.getByRole('radio',{name:'拆除'}));assert.equal(ui.getSnapshot().continuous,true);assert(screen.getByText('拖动拆除 · 空格环绕'));
await act(()=>ui.update({touchInput:true}));assert(screen.getByText('拖动拆除 · 双指移动'));await user.click(continuous);assert(screen.getByText('轻点拆除 · 拖动环绕'));
await user.click(screen.getByRole('button',{name:'更多'}));await user.click(screen.getByRole('menuitem',{name:'夜晚'}));assert(screen.getByRole('menuitem',{name:'白天'}));
await user.click(screen.getByRole('menuitem',{name:'放大'}));await user.keyboard('{Escape}');
const canvas=document.getElementById('world');canvas.addEventListener('pointerdown',()=>{canvas.focus();ui.update({panel:null})});
await user.click(screen.getByRole('button',{name:'笔刷与颜色'}));await user.click(canvas);assert.equal(ui.getSnapshot().panel,null);assert.equal(document.activeElement.id,'world','Popover dismissal does not steal canvas focus');
await user.click(screen.getByRole('button',{name:'更多'}));await user.click(canvas);assert.equal(ui.getSnapshot().panel,null);assert.equal(document.activeElement.id,'world','Menu dismissal does not steal canvas focus');
cleanup();console.log('PASS: React/shadcn controls, toolbar modes, color/random/style/brush selections, nested select, Esc and focus return, menu toggles, help, clear cancel/confirm, undo availability, theme.');
}finally{await fs.rm(output,{force:true});window.close()}
