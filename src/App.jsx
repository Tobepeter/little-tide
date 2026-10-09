import React, { useSyncExternalStore } from 'react';
import { House, Layers2, Paintbrush, PaintRoller, Eraser, Shuffle, Check, Undo2, Redo2, Ellipsis, Camera, Moon, Sun, LocateFixed, Plus, Minus, Orbit, Grid2X2, Sparkles, Volume2, VolumeX, CircleHelp, Trash2 } from 'lucide-react';
import { ui } from './ui-store.js';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

const colors = ['#ea7b83','#f0d57f','#a2b894','#87abc1','#b19dc1','#e5a27c'];
const names = ['珊瑚红','奶油黄','鼠尾草绿','雾蓝','丁香紫','蜜桃橙'];
const tools = [['build','建造','1',House],['platform','平台','2',Layers2],['paint','上色','3',Paintbrush],['erase','拆除','4',Eraser]];

function Hint({ label, shortcut, children, side='top' }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent side={side} sideOffset={10}>{label}{shortcut && <kbd className="ml-2 opacity-60">{shortcut}</kbd>}</TooltipContent></Tooltip>;
}
function IconButton({label, shortcut, touchLabel, icon:Icon, children, className='', side, onClick, ...props}) {
  return <Hint label={label} shortcut={shortcut} side={side}><Button type="button" variant="ghost" size="icon" aria-label={label} className={`tool-button dock-tool ${className}`} {...props} onClick={e=>{onClick?.(e);if(e.detail>0&&!props['aria-haspopup'])ui.actions.focusCanvas?.()}}><span className="tool-face">{Icon?<Icon aria-hidden="true"/>:children}</span>{touchLabel&&<span className="touch-label" aria-hidden="true">{touchLabel}</span>}{shortcut&&<kbd className="keycap-tool" aria-hidden="true">{shortcut}</kbd>}</Button></Hint>;
}
function Picker({label,value,onValueChange,children}) {
  return <div className="setting-row"><span>{label}</span><Select value={String(value)} onValueChange={onValueChange}><SelectTrigger className="w-36 h-9 text-xs" aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select></div>;
}
export function App() {
  const s=useSyncExternalStore(ui.subscribe,ui.getSnapshot,ui.getSnapshot), a=ui.actions;
  const panel=name=>open=>a.openPanel?.(open?name:null);
  const focusAfterPointer=e=>{if(e.detail>0)a.focusCanvas?.()};
  const keepCanvasFocus=e=>{if(document.activeElement?.id==='world'||ui.getSnapshot().dialog)e.preventDefault()};
  const brushing=s.continuous||(!s.touchInput&&s.shiftHeld&&!s.spaceHeld);
  const editName=({build:'建造',platform:'铺设',paint:'上色',erase:'拆除'})[s.mode];
  const hint=s.spaceHeld?'拖动环绕 · 松开空格返回':brushing?`拖动${editName} · ${s.touchInput?'双指移动':'空格环绕'}`:`轻点${editName} · 拖动环绕`;
  const restoreFocus=e=>{e.preventDefault();document.getElementById('more')?.focus()};
  return <TooltipProvider delayDuration={450} skipDelayDuration={150}>
    <footer className="dock-position surface">
      <div className="dock" role="toolbar" aria-label="搭建工具" aria-busy={!s.ready}>
      <ToggleGroup type="single" value={s.mode} onValueChange={value=>value&&a.setMode?.(value)} className="tool-group" aria-label="工具" disabled={!s.ready}>
        {tools.map(([value,label,shortcut,Icon])=><Hint key={value} label={label} shortcut={shortcut}><ToggleGroupItem value={value} aria-label={label} aria-keyshortcuts={shortcut} onClick={focusAfterPointer} className="tool-button dock-tool"><span className="tool-face"><Icon aria-hidden="true"/></span><kbd className="keycap-tool" aria-hidden="true">{shortcut}</kbd></ToggleGroupItem></Hint>)}
      </ToggleGroup>
      <Separator orientation="vertical" className="dock-divider"/>
      <IconButton label="连续刷" shortcut="B" touchLabel="连刷" icon={PaintRoller} aria-keyshortcuts="b" aria-pressed={s.continuous} className={`continuous-toggle ${brushing?'is-on':''}`} disabled={!s.ready} onClick={()=>a.toggleContinuous?.()}/>
      <Popover open={s.panel==='brush'} onOpenChange={panel('brush')}><PopoverTrigger asChild><IconButton label="笔刷与颜色" shortcut="C" aria-keyshortcuts="c" className="color-button" disabled={!s.ready}><span className={`color-disc ${s.selected<0?'random':''}`} style={s.selected>=0?{backgroundColor:colors[s.selected]}:undefined}/>{s.selected<0?<Shuffle className="color-icon"/>:<Check className="color-icon"/>}</IconButton></PopoverTrigger>
        <PopoverContent onCloseAutoFocus={keepCanvasFocus} side="top" sideOffset={12} align="center" collisionPadding={14} className="brush-popover w-72 rounded-xl p-4">
          <div className="setting-row mb-3"><span>颜色</span><Button variant={s.selected===-1?'secondary':'ghost'} size="sm" className="h-8 text-xs gap-2" aria-pressed={s.selected===-1} onClick={()=>a.setColor?.(-1)}><Shuffle size={14}/>随机</Button></div>
          <div className="color-palette" role="group" aria-label="颜色">{colors.map((c,i)=><Button key={c} variant="ghost" size="icon" className="palette-button" aria-label={names[i]} aria-pressed={s.selected===i} style={{backgroundColor:c}} onClick={()=>a.setColor?.(i)}>{s.selected===i&&<Check aria-hidden="true"/>}</Button>)}</div>
          <Separator className="my-4"/>
          <Picker label="房型" value={s.selectedStyle} onValueChange={v=>a.setStyle?.(Number(v))}>{[['-1','随机搭配'],['0','经典尖顶'],['1','斜坡屋顶'],['2','阳光露台'],['3','木构小屋']].map(([v,label])=><SelectItem key={v} value={v}>{label}</SelectItem>)}</Picker>
          <div className="setting-row mt-4"><span>范围</span><ToggleGroup type="single" value={String(s.brushSize)} onValueChange={v=>v&&a.setBrushSize?.(Number(v))} className="segmented" aria-label="笔刷大小">{[1,3,5].map(n=><ToggleGroupItem key={n} value={String(n)} aria-label={`${n} × ${n} 笔刷`} className="h-8 min-w-10 px-2 text-xs">{n}×{n}</ToggleGroupItem>)}</ToggleGroup></div>
          {s.mode==='erase'&&<div className="setting-row mt-4"><span>拆除</span><ToggleGroup type="single" value={s.eraseWhole?'all':'layer'} onValueChange={v=>v&&a.setEraseWhole?.(v==='all')} className="segmented" aria-label="拆除方式"><ToggleGroupItem value="all" className="h-8 text-xs px-3">整栋</ToggleGroupItem><ToggleGroupItem value="layer" className="h-8 text-xs px-3">一层</ToggleGroupItem></ToggleGroup></div>}
        </PopoverContent>
      </Popover>
      <Separator orientation="vertical" className="dock-divider"/>
      <IconButton label="撤销" aria-keyshortcuts="Control+z Meta+z" icon={Undo2} disabled={!s.canUndo} onClick={()=>a.undo?.()}/><IconButton label="重做" aria-keyshortcuts="Control+Shift+z Meta+Shift+z" icon={Redo2} disabled={!s.canRedo} onClick={()=>a.redo?.()}/>
      <DropdownMenu open={s.panel==='menu'} onOpenChange={panel('menu')} modal={false}><DropdownMenuTrigger asChild><IconButton id="more" label="更多" icon={Ellipsis} disabled={!s.ready}/></DropdownMenuTrigger><DropdownMenuContent onCloseAutoFocus={keepCanvasFocus} side="top" align="end" sideOffset={12} collisionPadding={14} className="w-60 rounded-xl p-1.5">
        <div className="menu-quick-actions" role="group" aria-label="视角与画面">{[[LocateFixed,'复位视角',()=>a.resetView?.(),'R'],[Minus,'缩小',()=>a.zoom?.(1.15)],[Plus,'放大',()=>a.zoom?.(.85)],[Camera,'拍照',()=>a.photo?.()],[s.night?Sun:Moon,s.night?'白天':'夜晚',()=>a.toggleDay?.()]].map(([Icon,label,action,shortcut],index)=><Hint key={index} label={label} shortcut={shortcut}><DropdownMenuItem className="menu-icon" aria-label={label} onSelect={e=>{e.preventDefault();action()}}><Icon aria-hidden="true"/></DropdownMenuItem></Hint>)}</div><DropdownMenuSeparator/>
        {[[Orbit,'自动环绕',s.autoRotate,a.toggleRotate],[Grid2X2,'网格',s.grid,a.toggleGrid],[Sparkles,'动画',s.motionEnabled,a.toggleMotion],[s.soundEnabled?Volume2:VolumeX,'音效',s.soundEnabled,a.toggleSound]].map(([Icon,label,checked,action])=><DropdownMenuCheckboxItem key={label} checked={checked} onCheckedChange={()=>action?.()} onSelect={e=>e.preventDefault()} className="menu-row"><Icon aria-hidden="true"/>{label}</DropdownMenuCheckboxItem>)}
        <DropdownMenuSeparator/><DropdownMenuItem className="menu-row" onSelect={()=>a.newTown?.()}><Shuffle/>随机小镇</DropdownMenuItem><DropdownMenuItem className="menu-row" onSelect={()=>a.openDialog?.('help')}><CircleHelp/>操作帮助</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem className="menu-row text-destructive focus:text-destructive" onSelect={()=>a.openDialog?.('clear')}><Trash2/>清空小镇</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div></footer><span className="sr-only" aria-live="polite">{hint}</span>
    <Dialog open={s.dialog==='help'} onOpenChange={open=>!open&&ui.update({dialog:null})}><DialogContent className="max-w-sm rounded-2xl" onCloseAutoFocus={restoreFocus}><DialogHeader><DialogTitle>操作方式</DialogTitle><DialogDescription className="sr-only">搭建和浏览小镇的快捷操作</DialogDescription></DialogHeader><dl className="help-list">{(s.touchInput? [['轻点并松手','编辑一处'],['单指拖动','环绕视角'],['双指拖动 / 捏合','平移 / 缩放'],['开启连续刷','拖动批量编辑'],['撤销','撤销整笔']] : [['点击并松手','编辑一处'],['左键拖动','环绕视角'],['右键 / 中键拖动','平移视角'],['滚轮','缩放'],['B / Shift + 拖动','连续刷 / 临时连刷'],['1—4 / C','工具 / 配色'],['Ctrl / ⌘ + Z','撤销整笔']]).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><DialogFooter><Button className="w-full" onClick={()=>ui.update({dialog:null})}>知道了</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={s.dialog==='clear'} onOpenChange={open=>!open&&ui.update({dialog:null})}><AlertDialogContent className="max-w-sm rounded-2xl" onCloseAutoFocus={restoreFocus}><AlertDialogHeader><AlertDialogTitle>清空小镇？</AlertDialogTitle><AlertDialogDescription>清空后可以撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={()=>a.clearTown?.()}>清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <div className={`game-toast ${s.toast?'visible':''}`} role="status" aria-live="polite">{s.toast}</div>
    <span className="sr-only" aria-live="off">{s.count} 栋小屋</span><span className="sr-only" role="status">{s.saved?'已自动保存':'暂未保存'}</span>
  </TooltipProvider>
}
