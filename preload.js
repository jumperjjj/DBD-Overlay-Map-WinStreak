const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('api',{
get:()=>ipcRenderer.invoke('get-settings'),patch:p=>ipcRenderer.invoke('patch',p),edit:on=>ipcRenderer.invoke('edit-mode',on),saveBounds:()=>ipcRenderer.invoke('save-bounds'),
setBounds:(k,b)=>ipcRenderer.invoke('set-bounds',k,b),openEditor:t=>ipcRenderer.invoke('open-editor',t),chooseMapImage:()=>ipcRenderer.invoke('choose-map-image'),
openMapsFolder:()=>ipcRenderer.invoke('open-maps-folder'),copy:t=>ipcRenderer.invoke('copy',t),quit:()=>ipcRenderer.invoke('quit'),
onSettings:f=>ipcRenderer.on('settings',(_,x)=>f(x)),onEdit:f=>ipcRenderer.on('edit-mode',(_,x)=>f(x)),onTab:f=>ipcRenderer.on('open-tab',(_,x)=>f(x))
});