const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('api',{
get:()=>ipcRenderer.invoke('get-settings'),patch:p=>ipcRenderer.invoke('patch',p),edit:on=>ipcRenderer.invoke('edit-mode',on),saveBounds:()=>ipcRenderer.invoke('save-bounds'),
openEditor:t=>ipcRenderer.invoke('open-editor',t),chooseMapImage:()=>ipcRenderer.invoke('choose-map-image'),resetMapImage:()=>ipcRenderer.invoke('reset-map-image'),
onSettings:f=>ipcRenderer.on('settings',(_,x)=>f(x)),onEdit:f=>ipcRenderer.on('edit-mode',(_,x)=>f(x)),onTab:f=>ipcRenderer.on('open-tab',(_,x)=>f(x))
});