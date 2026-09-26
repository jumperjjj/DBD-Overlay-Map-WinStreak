const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('api',{
get:()=>ipcRenderer.invoke('get-settings'),patch:p=>ipcRenderer.invoke('patch',p),selectMap:n=>ipcRenderer.invoke('select-map',n),edit:x=>ipcRenderer.invoke('edit',x),
savePos:()=>ipcRenderer.invoke('save-pos'),scale:(k,v)=>ipcRenderer.invoke('scale',k,v),hotkey:a=>ipcRenderer.invoke('hotkey',a),openEditor:t=>ipcRenderer.invoke('open-editor',t),quit:()=>ipcRenderer.invoke('quit'),
onSettings:f=>ipcRenderer.on('settings',(_,x)=>f(x)),onEdit:f=>ipcRenderer.on('edit-mode',(_,x)=>f(x)),onTab:f=>ipcRenderer.on('open-tab',(_,x)=>f(x))
});