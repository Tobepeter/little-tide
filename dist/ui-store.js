// One shared, framework-independent bridge between the canvas and React controls.
let snapshot = {ready:false, mode:'build', continuous:false, shiftHeld:false, touchInput:false, selected:-1, selectedStyle:-1, brushSize:1,
  eraseWhole:true, night:false, motionEnabled:true, soundEnabled:true, autoRotate:false,
  grid:true, canUndo:false, canRedo:false, count:0, saved:true, panel:null, dialog:null,
  spaceHeld:false, toast:''};
const listeners = new Set();
export const ui = {
  actions: {},
  getSnapshot: () => snapshot,
  subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  update(patch) {
    if (!Object.keys(patch).some(key => snapshot[key] !== patch[key])) return;
    snapshot = {...snapshot, ...patch};
    listeners.forEach(listener => listener());
  }
};
