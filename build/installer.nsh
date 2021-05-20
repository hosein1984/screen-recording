!include x64.nsh

; $INSTDIR -> points to the installation directory exactly where the app.exe will reside

!macro customInstall
  ; Register your virtual-audio-capturere and screen-capture-recorder dlls
  ${If} ${RunningX64}
    MessageBox MB_OK "Trying to register: $INSTDIR\resources\extra\win32\ffmpeg\screen-capture-recorder-x64.dll"

    ExecWait 'regsvr32 /s "$INSTDIR\resources\extra\win32\ffmpeg\screen-capture-recorder-x64.dll"'
    ExecWait 'regsvr32 /s "$INSTDIR\resources\extra\win32\ffmpeg\audio_sniffer-x64.dll"'
  ${Else}
    ExecWait 'regsvr32 /s "$INSTDIR\resources\extra\win32\ffmpeg\screen-capture-recorder.dll"'
    ExecWait 'regsvr32 /s "$INSTDIR\resources\extra\win32\ffmpeg\audio_sniffer.dll"'
  ${EndIf}   

!macroend

!macro customUnInit

  ; Unregister your virtual-audio-capturere and screen-capture-recorder dlls
   ${If} ${RunningX64}
    ExecWait 'regsvr32 /s /u "$INSTDIR\resources\extra\win32\ffmpeg\screen-capture-recorder-x64.dll"'
    ExecWait 'regsvr32 /s /u "$INSTDIR\resources\extra\win32\ffmpeg\audio_sniffer-x64.dll"'
  ${Else}
    ExecWait 'regsvr32 /s /u "$INSTDIR\resources\extra\win32\ffmpeg\screen-capture-recorder.dll"'
    ExecWait 'regsvr32 /s /u "$INSTDIR\resources\extra\win32\ffmpeg\audio_sniffer.dll"'
  ${EndIf} 

!macroend