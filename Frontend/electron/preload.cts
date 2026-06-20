import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("smartpark", {
  platform: process.platform
});
