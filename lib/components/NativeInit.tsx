"use client";
import { useEffect } from "react";
import { initNativePlugins, isNative } from "@/lib/native/capacitor-bridge";

export default function NativeInit() {
  useEffect(() => {
    if (isNative()) {
      initNativePlugins();
    }
  }, []);

  return null;
}
